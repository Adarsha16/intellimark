import os
import argparse
import math
import torch
import torch.nn.functional as F
from accelerate import Accelerator
from accelerate.utils import set_seed
from datasets import load_dataset
from diffusers import AutoencoderKL, DDPMScheduler, DiffusionPipeline, UNet2DConditionModel
from diffusers.optimization import get_scheduler
from diffusers.utils.import_utils import is_xformers_available
from transformers import CLIPTextModel, CLIPTokenizer
from peft import LoraConfig, get_peft_model, PeftModel
from torchvision import transforms
from tqdm.auto import tqdm
from PIL import Image
import io
import numpy as np
import re

def parse_args():
    parser = argparse.ArgumentParser(description="Advanced Fine-Tuning Script for Stable Diffusion LoRA (Poster Edition).")
    parser.add_argument("--model_id", type=str, default="runwayml/stable-diffusion-v1-5")
    parser.add_argument("--parquet_dir", type=str, default=".")
    parser.add_argument("--output_dir", type=str, default="lora_output_v2")
    parser.add_argument("--resolution", type=int, default=512)
    parser.add_argument("--train_batch_size", type=int, default=1)
    parser.add_argument("--num_train_epochs", type=int, default=10)
    parser.add_argument("--learning_rate", type=float, default=1e-4)
    parser.add_argument("--lr_scheduler", type=str, default="cosine_with_restarts")
    parser.add_argument("--lr_warmup_steps", type=int, default=100)
    parser.add_argument("--gradient_accumulation_steps", type=int, default=4)
    parser.add_argument("--mixed_precision", type=str, default="fp16", choices=["no", "fp16", "bf16"])
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max_train_samples", type=int, default=None)
    parser.add_argument("--snr_gamma", type=float, default=5.0)
    parser.add_argument("--noise_offset", type=float, default=0.1)
    parser.add_argument("--rank", type=int, default=32)
    parser.add_argument("--alpha", type=int, default=64)
    # New argument to relax filtering if needed
    parser.add_argument("--include_characters", action="store_true", help="If set, 'character' won't be filtered out.")
    return parser.parse_args()

def compute_snr(timesteps, noise_scheduler):
    alphas_cumprod = noise_scheduler.alphas_cumprod
    snr = alphas_cumprod[timesteps] / (1.0 - alphas_cumprod[timesteps])
    return snr

def main():
    args = parse_args()
    accelerator = Accelerator(gradient_accumulation_steps=args.gradient_accumulation_steps, mixed_precision=args.mixed_precision)
    set_seed(args.seed)

    tokenizer = CLIPTokenizer.from_pretrained(args.model_id, subfolder="tokenizer")
    noise_scheduler = DDPMScheduler.from_pretrained(args.model_id, subfolder="scheduler")
    text_encoder = CLIPTextModel.from_pretrained(args.model_id, subfolder="text_encoder")
    vae = AutoencoderKL.from_pretrained(args.model_id, subfolder="vae")
    unet = UNet2DConditionModel.from_pretrained(args.model_id, subfolder="unet")

    vae.requires_grad_(False)
    text_encoder.requires_grad_(False)
    unet.requires_grad_(False)
    unet.enable_gradient_checkpointing()

    lora_config = LoraConfig(
        r=args.rank, lora_alpha=args.alpha, init_lora_weights="gaussian",
        target_modules=["to_k", "to_q", "to_v", "to_out.0"],
    )
    unet = get_peft_model(unet, lora_config)
    
    parquet_files = [os.path.join(args.parquet_dir, f"train-{i:05d}-of-00094.parquet") for i in range(7)]
    existing_files = [f for f in parquet_files if os.path.exists(f)]
    dataset = load_dataset("parquet", data_files=existing_files, split="train")

    # SMART FILTERING
    # Basic quality and blatant text filters
    bad_quality = ["blurry", "low quality", "distorted", "ugly", "bad anatomy", "glitch", "error"]
    text_indicators = ["watermark", "alphabet", "signature", "username", "subtitle", "inscription", "written language"]
    
    # Human figures - using word boundaries to avoid false positives (e.g. "manual", "performance")
    human_keywords = ["man", "woman", "men", "women", "human", "person", "face", "boy", "girl", "people", "crowd"]
    body_parts = ["hands", "feet", "fingers", "body parts", "legs", "arms"]

    def filter_dataset(example):
        caption = example["caption"].lower()
        
        # Check bad quality/text
        for word in bad_quality + text_indicators:
            if word in caption: return False
            
        # Regex for word boundaries on sensitive keywords
        for word in human_keywords + body_parts:
            if re.search(rf"\b{word}\b", caption):
                return False
        
        # Handle "character" - filter only if NOT explicitly allowed
        if not args.include_characters:
            if re.search(rf"\bcharacter\b", caption):
                return False
                
        # Heuristic for generic "text" (ignore if it's just "the text of the poster" in a meta-description sense maybe?)
        if "written text" in caption or "visible text" in caption:
            return False

        return True

    print("Filtering dataset based on negative keywords...")
    dataset = dataset.filter(filter_dataset)
    print(f"Dataset size after filtering: {len(dataset)}")

    if len(dataset) < 100:
        print("WARNING: Dataset is very small. Consider using --include_characters if you want artistic characters.")

    if args.max_train_samples is not None:
        dataset = dataset.shuffle(seed=args.seed).select(range(min(len(dataset), args.max_train_samples)))

    train_transforms = transforms.Compose([
        transforms.Resize(args.resolution, interpolation=transforms.InterpolationMode.BILINEAR),
        transforms.CenterCrop(args.resolution),
        transforms.ToTensor(),
        transforms.Normalize([0.5], [0.5]),
    ])

    def preprocess(examples):
        images = [Image.open(io.BytesIO(img_bytes)).convert("RGB") for img_bytes in examples["image"]]
        examples["pixel_values"] = [train_transforms(image) for image in images]
        inputs = tokenizer(examples["caption"], max_length=tokenizer.model_max_length, padding="max_length", truncation=True, return_tensors="pt")
        examples["input_ids"] = inputs.input_ids
        return examples

    with accelerator.main_process_first():
        train_dataset = dataset.with_transform(preprocess)

    train_dataloader = torch.utils.data.DataLoader(train_dataset, batch_size=args.train_batch_size, shuffle=True)

    try:
        import bitsandbytes as bnb
        optimizer = bnb.optim.AdamW8bit(unet.parameters(), lr=args.learning_rate)
        print("Using 8-bit AdamW.")
    except ImportError:
        optimizer = torch.optim.AdamW(unet.parameters(), lr=args.learning_rate)

    lr_scheduler = get_scheduler(
        args.lr_scheduler, optimizer=optimizer,
        num_warmup_steps=args.lr_warmup_steps * args.gradient_accumulation_steps,
        num_training_steps=len(train_dataloader) * args.num_train_epochs,
    )

    unet, optimizer, train_dataloader, lr_scheduler = accelerator.prepare(unet, optimizer, train_dataloader, lr_scheduler)
    weight_dtype = torch.float16 if accelerator.mixed_precision == "fp16" else torch.bfloat16 if accelerator.mixed_precision == "bf16" else torch.float32
    vae.to(accelerator.device, dtype=weight_dtype)
    text_encoder.to(accelerator.device, dtype=weight_dtype)

    print(f"Starting training for {args.num_train_epochs} epochs...")
    for epoch in range(args.num_train_epochs):
        unet.train()
        progress_bar = tqdm(total=len(train_dataloader), disable=not accelerator.is_local_main_process)
        progress_bar.set_description(f"Epoch {epoch}")
        for step, batch in enumerate(train_dataloader):
            with accelerator.accumulate(unet):
                latents = vae.encode(batch["pixel_values"].to(dtype=weight_dtype)).latent_dist.sample() * vae.config.scaling_factor
                noise = torch.randn_like(latents)
                if args.noise_offset:
                    noise += args.noise_offset * torch.randn((latents.shape[0], latents.shape[1], 1, 1), device=latents.device)
                timesteps = torch.randint(0, noise_scheduler.config.num_train_timesteps, (latents.shape[0],), device=latents.device).long()
                noisy_latents = noise_scheduler.add_noise(latents, noise, timesteps)
                encoder_hidden_states = text_encoder(batch["input_ids"])[0]
                model_pred = unet(noisy_latents, timesteps, encoder_hidden_states).sample
                if args.snr_gamma:
                    snr = compute_snr(timesteps, noise_scheduler).to(model_pred.device)
                    mse_loss_weights = torch.stack([snr, args.snr_gamma * torch.ones_like(timesteps)], dim=1).min(dim=1)[0] / snr
                    loss = F.mse_loss(model_pred.float(), noise.float(), reduction="none")
                    loss = loss.mean(dim=list(range(1, len(loss.shape)))) * mse_loss_weights
                    loss = loss.mean()
                else:
                    loss = F.mse_loss(model_pred.float(), noise.float(), reduction="mean")
                accelerator.backward(loss)
                optimizer.step()
                lr_scheduler.step()
                optimizer.zero_grad()
            if accelerator.sync_gradients: progress_bar.update(1)
            progress_bar.set_postfix(loss=loss.detach().item(), lr=lr_scheduler.get_last_lr()[0])
        
        # Save at end of each epoch
        if accelerator.is_main_process:
            save_path = os.path.join(args.output_dir, f"checkpoint-epoch-{epoch}")
            accelerator.unwrap_model(unet).save_pretrained(save_path)
            print(f"Epoch {epoch} saved to {save_path}")

    if accelerator.is_main_process:
        accelerator.unwrap_model(unet).save_pretrained(args.output_dir)
        print(f"Final model saved to {args.output_dir}")

if __name__ == "__main__":
    main()
