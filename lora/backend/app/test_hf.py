from transformers import CLIPTokenizer
import traceback

model_id = "stabilityai/stable-diffusion-2-base"
try:
    print(f"Testing tokenizer download for: {model_id}")
    tokenizer = CLIPTokenizer.from_pretrained(model_id, subfolder="tokenizer")
    print("SUCCESS: Tokenizer loaded")
except Exception:
    print("\n--- ERROR ---")
    traceback.print_exc()

model_id_v21 = "stabilityai/stable-diffusion-2-1-base"
try:
    print(f"\nTesting tokenizer download for: {model_id_v21}")
    tokenizer = CLIPTokenizer.from_pretrained(model_id_v21, subfolder="tokenizer")
    print("SUCCESS: Tokenizer loaded")
except Exception:
    print("\n--- ERROR ---")
    traceback.print_exc()

model_id_sd21 = "stabilityai/stable-diffusion-2-1" # 768 version
try:
    print(f"\nTesting tokenizer download for: {model_id_sd21}")
    tokenizer = CLIPTokenizer.from_pretrained(model_id_sd21, subfolder="tokenizer")
    print("SUCCESS: Tokenizer loaded")
except Exception:
    print("\n--- ERROR ---")
    traceback.print_exc()
