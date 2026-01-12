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

def parse_args():
    parser = argparse.ArgumentParser(description="Advanced Fine-Tuning Script for Stable Diffusion LoRA (Poster Edition).")
    parser.add_argument("--model_id", type=str, default="runwayml/stable-diffusion-v1-5")
    parser.add_argument("--parquet_dir", type=str, default=".")
    parser.add_argument("--output_dir", type=str, default="lora_output_v2")
    parser.add_argument("--resolution", type=int, default=512)
    parser.add_argument("--train_batch_size", type=int, default=1)
    parser.add_argument("--num_train_epochs", type=int, default=5)
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
    return parser.parse_args()

def compute_snr(timesteps, noise_scheduler):
    alphas_cumprod = noise_scheduler.alphas_cumprod
    sqrt_alphas_cumprod = alphas_cumprod**0.5
    sqrt_one_minus_alphas_cumprod = (1.0 - alphas_cumprod)**0.5
    sqrt_alphas_cumprod = sqrt_alphas_cumprod.to(device=timesteps.device)[timesteps].float()
    while len(sqrt_alphas_cumprod.shape) < len(timesteps.shape):
        sqrt_alphas_cumprod = sqrt_alphas_cumprod[..., None]
    sqrt_one_minus_alphas_cumprod = sqrt_one_minus_alphas_cumprod.to(device=timesteps.device)[timesteps].float()
    while len(sqrt_one_minus_alphas_cumprod.shape) < len(timesteps.shape):
        sqrt_one_minus_alphas_cumprod = sqrt_one_minus_alphas_cumprod[..., None]
    snr = (sqrt_alphas_cumprod / sqrt_one_minus_alphas_cumprod)**2
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
        r=args.rank,
        lora_alpha=args.alpha,
        init_lora_weights="gaussian",
        target_modules=["to_k", "to_q", "to_v", "to_out.0"],
    )
    unet = get_peft_model(unet, lora_config)
    unet.print_trainable_parameters()

    parquet_files = [os.path.join(args.parquet_dir, f"train-{i:05d}-of-00094.parquet") for i in range(7)]
    existing_files = [f for f in parquet_files if os.path.exists(f)]
    if not existing_files:
        print("No provided parquet files found.")
        return
    
    dataset = load_dataset("parquet", data_files=existing_files, split="train")
    
    # REFINED FILTERING LOGIC
    negative_words = [
        "watermark", "blurry", "low quality", "distorted", "ugly", "bad anatomy",
        "alphabet", "signature", "username", "error", "glitch",
        "calligraphy", "inscription", "subtitle", "ad text", "menu text", 
        "newspaper", "magazine", "document", "paper with text", "written language",
        "bad hands", "extra fingers", "mutated hands", "deformed hands", 
        "photographic face", "real human", "self-portrait", "audience", "crowd"
    ]
    
    strict_negative_words = [
        "man", "woman", "men", "women", "human", "person", "face", "hands", "feet", "fingers"
    ]
    
    def filter_dataset(example):
        caption = example["caption"].lower()
        for word in negative_words:
            if word in caption: return False
        for word in strict_negative_words:
            if word in caption: return False
        if " text" in caption or "text " in caption:
            if "written text" in caption or "visible text" in caption: return False
        return True

    print("Filtering dataset based on negative keywords...")
    dataset = dataset.filter(filter_dataset)
    print(f"Dataset size after filtering: {len(dataset)}")

    if len(dataset) == 0:
        print("CRITICAL: Dataset is empty after filtering! Skipping filtering for now to allow progress.")
        dataset = load_dataset("parquet", data_files=existing_files, split="train")

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
                bsz = latents.shape[0]
                timesteps = torch.randint(0, noise_scheduler.config.num_train_timesteps, (bsz,), device=latents.device).long()
                noisy_latents = noise_scheduler.add_noise(latents, noise, timesteps)
                encoder_hidden_states = text_encoder(batch["input_ids"])[0]
                model_pred = unet(noisy_latents, timesteps, encoder_hidden_states).sample
                if args.snr_gamma:
                    snr = compute_snr(timesteps, noise_scheduler)
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
            if accelerator.sync_gradients:
                progress_bar.update(1)
            progress_bar.set_postfix(loss=loss.detach().item(), lr=lr_scheduler.get_last_lr()[0])
        save_path = os.path.join(args.output_dir, f"checkpoint-epoch-{epoch}")
        accelerator.unwrap_model(unet).save_pretrained(save_path)
    unet = accelerator.unwrap_model(unet)
    unet.save_pretrained(args.output_dir)
    print(f"Model saved to {args.output_dir}")

if __name__ == "__main__":
    main()
