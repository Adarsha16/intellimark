import torch
import os
from diffusers import StableDiffusionPipeline
from peft import PeftModel  # Ensure you have pip install peft

# 1. Paths
MODEL_ID = "runwayml/stable-diffusion-v1-5"
LORA_PATH = "./lora_output"

print("--- Step 1: Loading Base Model ---")
pipe = StableDiffusionPipeline.from_pretrained(
    MODEL_ID, 
    torch_dtype=torch.float32,
    use_safetensors=True
)
pipe.to("cpu")

# 2. Load the LoRA adapter correctly
if os.path.exists(os.path.join(LORA_PATH, "adapter_model.bin")) or \
   os.path.exists(os.path.join(LORA_PATH, "adapter_model.safetensors")):
    
    print(f"--- Step 2: Loading PEFT Adapter from {LORA_PATH} ---")
    # We apply the weights directly to the unet
    pipe.unet = PeftModel.from_pretrained(pipe.unet, LORA_PATH)
    
    # In 2026, we need to ensure the adapter is active
    # This merges the weights for faster CPU inference
    # pipe.unet = pipe.unet.merge_and_unload() 
    
    print("✅ LoRA successfully attached to UNet!")
else:
    print(f"❌ Error: Could not find adapter files in {LORA_PATH}")
    print("Make sure adapter_model.bin and adapter_config.json are in that folder.")

# 3. Generate a Test Image
print("--- Step 3: Generating Image (CPU) ---")
prompt = "A professional club event poster with neon lights, high resolution, 4k"

# Use a low number of steps for CPU testing
image = pipe(prompt, num_inference_steps=20).images[0]

# 4. Save
image.save("lora_test_result.png")
print("✅ Done! Check lora_test_result.png")