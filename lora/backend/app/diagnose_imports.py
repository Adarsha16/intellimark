import traceback
import sys

print("Python version:", sys.version)

try:
    print("Attempting to import torch...")
    import torch
    print("Torch version:", torch.__version__)
    print("CUDA available:", torch.cuda.is_available())
    
    print("Attempting to import accelerate...")
    from accelerate import Accelerator
    print("Accelerate OK")
    
    print("Attempting to import datasets...")
    from datasets import load_dataset
    print("Datasets OK")
    
    print("Attempting to import transformers...")
    from transformers import CLIPTextModel, CLIPTokenizer
    print("Transformers OK")
    
    print("Attempting to import diffusers...")
    from diffusers import AutoencoderKL, DDPMScheduler, DiffusionPipeline, UNet2DConditionModel
    print("Diffusers OK")
    
    print("Attempting to import peft...")
    from peft import LoraConfig, get_peft_model, PeftModel
    print("Peft OK")
    
    print("All core imports SUCCESSFUL")
    
except Exception:
    print("\n--- IMPORT ERROR DETECTED ---")
    traceback.print_exc()
    sys.exit(1)
