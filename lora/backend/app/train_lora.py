import os
import torch
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from accelerate import Accelerator
from diffusers import UNet2DConditionModel, StableDiffusionPipeline, DDPMScheduler
from diffusers.optimization import get_scheduler
from peft import LoraConfig, get_peft_model
from torchvision import transforms
from PIL import Image
from tqdm.auto import tqdm
import bitsandbytes as bnb

# --- CONFIGURATION ---
MODEL_ID = "runwayml/stable-diffusion-v1-5"
IMG_DIR = "./dataset/images"
CAPTION_DIR = "./dataset/captions"
OUTPUT_DIR = "./output/club_lora"

# Hyperparameters for 4000 images
EPOCHS = 2                    # 1-2 epochs is plenty for 4k images
BATCH_SIZE = 4                # Increase this if you have 12GB+ VRAM
GRADIENT_ACCUMULATION_STEPS = 2 # Effective Batch Size = 8
LEARNING_RATE = 1e-4
RESOLUTION = 512
SAVE_STEPS = 500              # Save checkpoint every 500 steps
NUM_WORKERS = 4               # CPU threads to load images fast

class SplitDataset(Dataset):
    def __init__(self, img_dir, caption_dir, tokenizer, size=512):
        self.img_dir = img_dir
        self.caption_dir = caption_dir
        self.tokenizer = tokenizer
        self.size = size
        self.image_files = [f for f in os.listdir(img_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        self.transform = transforms.Compose([
            transforms.Resize(size, interpolation=transforms.InterpolationMode.BILINEAR),
            transforms.CenterCrop(size),
            transforms.ToTensor(),
            transforms.Normalize([0.5], [0.5]),
        ])

    def __len__(self):
        return len(self.image_files)

    def __getitem__(self, i):
        try:
            img_name = self.image_files[i]
            base_name = os.path.splitext(img_name)[0]
            
            image = Image.open(os.path.join(self.img_dir, img_name)).convert("RGB")
            pixel_values = self.transform(image)

            cap_path = os.path.join(self.caption_dir, f"{base_name}.txt")
            caption = open(cap_path, "r", encoding="utf-8").read().strip() if os.path.exists(cap_path) else "club event"

            input_ids = self.tokenizer(caption, padding="max_length", max_length=self.tokenizer.model_max_length, 
                                     truncation=True, return_tensors="pt").input_ids[0]
            return {"pixel_values": pixel_values, "input_ids": input_ids}
        except Exception as e:
            print(f"Skipping corrupt image {self.image_files[i]}: {e}")
            return None

def main():
    # 1. Initialize Accelerator
    accelerator = Accelerator(
        mixed_precision="fp16",
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS
    )

    # 2. Load Models
    tokenizer = StableDiffusionPipeline.from_pretrained(MODEL_ID, subfolder="tokenizer").tokenizer
    noise_scheduler = DDPMScheduler.from_pretrained(MODEL_ID, subfolder="scheduler")
    vae = StableDiffusionPipeline.from_pretrained(MODEL_ID, subfolder="vae").vae
    text_encoder = StableDiffusionPipeline.from_pretrained(MODEL_ID, subfolder="text_encoder").text_encoder
    unet = UNet2DConditionModel.from_pretrained(MODEL_ID, subfolder="unet")

    vae.requires_grad_(False)
    text_encoder.requires_grad_(False)
    
    # SPEED BOOST: Native PyTorch Attention (Fast as xformers, but no conflicts)
    unet.set_attn_processor(torch.nn.modules.activation.MultiheadAttention) 
    # Enable Gradient Checkpointing to save VRAM for larger batches
    unet.enable_gradient_checkpointing()

    # 3. LoRA Setup
    lora_config = LoraConfig(
        r=16, # Increased rank slightly for 4000 images
        lora_alpha=16,
        target_modules=["to_q", "to_k", "to_v", "to_out.0"],
        lora_dropout=0.05,
    )
    unet = get_peft_model(unet, lora_config)

    # 4. Dataset with Multi-threading
    train_dataset = SplitDataset(IMG_DIR, CAPTION_DIR, tokenizer, RESOLUTION)
    train_dataloader = DataLoader(
        train_dataset, 
        batch_size=BATCH_SIZE, 
        shuffle=True, 
        num_workers=NUM_WORKERS,
        pin_memory=True
    )

    # 5. Fast 8-bit Optimizer
    optimizer = bnb.optim.AdamW8bit(unet.parameters(), lr=LEARNING_RATE)

    # Prepare everything
    unet, optimizer, train_dataloader = accelerator.prepare(unet, optimizer, train_dataloader)
    vae.to(accelerator.device, dtype=torch.float16)
    text_encoder.to(accelerator.device, dtype=torch.float16)

    # 6. Training Loop
    global_step = 0
    num_update_steps_per_epoch = len(train_dataloader)
    max_train_steps = EPOCHS * num_update_steps_per_epoch

    print(f"🚀 Starting Fast Training: {len(train_dataset)} images | {max_train_steps} total steps")
    
    for epoch in range(EPOCHS):
        unet.train()
        progress_bar = tqdm(total=num_update_steps_per_epoch, desc=f"Epoch {epoch+1}/{EPOCHS}")
        
        for step, batch in enumerate(train_dataloader):
            if batch is None: continue # Skip corrupt data

            with accelerator.accumulate(unet):
                # Encode latents
                latents = vae.encode(batch["pixel_values"].to(dtype=torch.float16)).latent_dist.sample() * 0.18215
                
                noise = torch.randn_like(latents)
                bsz = latents.shape[0]
                timesteps = torch.randint(0, noise_scheduler.config.num_train_timesteps, (bsz,), device=latents.device).long()
                noisy_latents = noise_scheduler.add_noise(latents, noise, timesteps)

                encoder_hidden_states = text_encoder(batch["input_ids"])[0]
                model_pred = unet(noisy_latents, timesteps, encoder_hidden_states).sample

                loss = F.mse_loss(model_pred.float(), noise.float(), reduction="mean")
                
                accelerator.backward(loss)
                optimizer.step()
                optimizer.zero_grad()
                
            progress_bar.update(1)
            global_step += 1
            
            # --- STEP-BASED CHECKPOINTING ---
            if global_step % SAVE_STEPS == 0:
                save_path = os.path.join(OUTPUT_DIR, f"checkpoint-{global_step}")
                accelerator.wait_for_everyone()
                unwrapped_model = accelerator.unwrap_model(unet)
                unwrapped_model.save_pretrained(save_path)
                print(f"\nStep {global_step}: Saved Checkpoint")

        progress_bar.close()

    # Final Save
    unwrapped_model = accelerator.unwrap_model(unet)
    unwrapped_model.save_pretrained(OUTPUT_DIR)
    print(f"✅ Training Finished! Saved to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()