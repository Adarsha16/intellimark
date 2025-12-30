import argparse
import torch
from diffusers import StableDiffusionXLPipeline
from PIL import Image, ImageDraw, ImageFont

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Running on {device}...")

    # Load Base SDXL
    pipe = StableDiffusionXLPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        use_safetensors=True,
    ).to(device)

    # 1. GENERATE IMAGE (No LoRA)
    print("Generating base image...")
    img = pipe(
        prompt="neon cyberpunk esports poster background, energetic, glowing, dark",
        num_inference_steps=25,
    ).images[0]

    # 2. ADD TEXT (Simple Overlay)
    draw = ImageDraw.Draw(img)
    try:
        # Windows standard font
        font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 60)
    except:
        font = ImageFont.load_default()
    
    draw.text((50, 50), "TEST SUCCESSFUL", fill="white", font=font)
    
    img.save("test_output.png")
    print("Saved test_output.png. Check this image.")

if __name__ == "__main__":
    main()