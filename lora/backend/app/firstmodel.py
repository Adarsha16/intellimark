import torch
from diffusers import StableDiffusionPipeline

model_id = "runwayml/stable-diffusion-v1-5"
lora_path = "output_lora/lora_epoch_3" # Point to your saved folder

pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16).to("cuda")

# Load your trained LoRA
pipe.load_lora_weights(lora_path)

# Run generation
prompt = "Futuristic workspace with holographic displays, cyan and electric blue aesthetic, clean minimalist architecture, glowing fiber optics, synthwave style, digital art, sharp focus, tech conference background."
image = pipe(prompt, num_inference_steps=30).images[0]
image.save("result.png")