import os
import torch
import torch.nn.functional as F
import matplotlib.pyplot as plt
import clip
from PIL import Image
from torchvision import transforms
from torch.utils.data import DataLoader

from diffusers import (
    StableDiffusionPipeline,
    DDPMScheduler
)

# ---------------- CONFIG ----------------
MODEL_ID = "runwayml/stable-diffusion-v1-5"
LORA_PATH = "output_lora/lora_epoch_3"   # contains adapter_model.safetensors

IMG_DIR = "./dataset/images"
CAPTION_DIR = "./dataset/captions"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16
RESOLUTION = 512
BATCH_SIZE = 4
EVAL_STEPS = 20

PROMPT = (
    "Futuristic workspace with holographic displays, "
    "cyan and electric blue aesthetic, clean minimalist architecture, "
    "glowing fiber optics, synthwave style, digital art"
)

# ---------------- DATASET ----------------
class EvalDataset(torch.utils.data.Dataset):
    def __init__(self, img_dir, cap_dir, tokenizer):
        self.images = os.listdir(img_dir)[:BATCH_SIZE * EVAL_STEPS]
        self.img_dir = img_dir
        self.cap_dir = cap_dir
        self.tokenizer = tokenizer

        self.transform = transforms.Compose([
            transforms.Resize(RESOLUTION),
            transforms.CenterCrop(RESOLUTION),
            transforms.ToTensor(),
            transforms.Normalize([0.5], [0.5])
        ])

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        name = self.images[idx]
        base = os.path.splitext(name)[0]

        img = Image.open(os.path.join(self.img_dir, name)).convert("RGB")
        img = self.transform(img)

        cap_path = os.path.join(self.cap_dir, base + ".txt")
        caption = open(cap_path, "r", encoding="utf-8", errors="ignore").read().strip() \
            if os.path.exists(cap_path) else "club event"


        tokens = self.tokenizer(
            caption,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        ).input_ids[0]

        return img, tokens

# ---------------- LOAD BASE PIPELINE ----------------
pipe = StableDiffusionPipeline.from_pretrained(
    MODEL_ID,
    torch_dtype=DTYPE,
    safety_checker=None,
    requires_safety_checker=False
).to(DEVICE)

tokenizer = pipe.tokenizer
vae = pipe.vae
text_encoder = pipe.text_encoder
unet = pipe.unet

noise_scheduler = DDPMScheduler.from_pretrained(MODEL_ID, subfolder="scheduler")

vae.eval()
text_encoder.eval()
unet.eval()

# ---------------- BASE IMAGE ----------------
with torch.inference_mode():
    base_img = pipe(PROMPT, num_inference_steps=25).images[0]

# ---------------- LOAD LoRA CORRECTLY ----------------
pipe.load_lora_weights(
    LORA_PATH,
    weight_name="adapter_model.safetensors"
)

with torch.inference_mode():
    lora_img = pipe(PROMPT, num_inference_steps=25).images[0]

# ---------------- IMAGE COMPARISON ----------------
plt.figure(figsize=(8,4))

plt.subplot(1,2,1)
plt.imshow(base_img)
plt.title("Base Stable Diffusion")
plt.axis("off")

plt.subplot(1,2,2)
plt.imshow(lora_img)
plt.title("LoRA Fine-tuned")
plt.axis("off")

plt.suptitle("Base vs LoRA Image Comparison")
plt.show()

# ---------------- CLIP SIMILARITY ----------------
clip_model, preprocess = clip.load("ViT-B/32", device=DEVICE)

def clip_score(image, text):
    image = preprocess(image).unsqueeze(0).to(DEVICE)
    text = clip.tokenize([text]).to(DEVICE)
    with torch.no_grad():
        i_f = clip_model.encode_image(image)
        t_f = clip_model.encode_text(text)
    return torch.cosine_similarity(i_f, t_f).item()

base_clip = clip_score(base_img, PROMPT)
lora_clip = clip_score(lora_img, PROMPT)

plt.figure()
plt.bar(["Base SD", "LoRA SD"], [base_clip, lora_clip])
plt.ylabel("CLIP Similarity Score")
plt.title("CLIP Similarity Comparison")
plt.show()

print(f"Base CLIP Score: {base_clip:.4f}")
print(f"LoRA CLIP Score: {lora_clip:.4f}")

# ---------------- SMALL BATCH LOSS ----------------
dataset = EvalDataset(IMG_DIR, CAPTION_DIR, tokenizer)
loader = DataLoader(dataset, batch_size=BATCH_SIZE)

loss_history = []

with torch.no_grad():
    for step, (imgs, tokens) in enumerate(loader):
        if step >= EVAL_STEPS:
            break

        imgs = imgs.to(DEVICE, dtype=DTYPE)
        tokens = tokens.to(DEVICE)

        latents = vae.encode(imgs).latent_dist.sample() * 0.18215
        noise = torch.randn_like(latents)

        timesteps = torch.randint(
            0,
            noise_scheduler.config.num_train_timesteps,
            (latents.shape[0],),
            device=DEVICE
        ).long()

        noisy_latents = noise_scheduler.add_noise(latents, noise, timesteps)
        text_emb = text_encoder(tokens)[0]

        pred = unet(noisy_latents, timesteps, text_emb).sample
        loss = F.mse_loss(pred.float(), noise.float())
        loss_history.append(loss.item())

# ---------------- LOSS PLOT ----------------
plt.figure()
plt.plot(loss_history, marker="o")
plt.xlabel("Evaluation Steps")
plt.ylabel("MSE Loss")
plt.title("Training Loss vs Steps (Small Batch)")
plt.grid(True)
plt.show()

print("✅ Evaluation complete")
