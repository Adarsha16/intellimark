import traceback
import sys

def debug_import(module_name):
    print(f"\n--- Debugging: {module_name} ---")
    try:
        __import__(module_name)
        print(f"SUCCESS: {module_name}")
    except Exception:
        print(f"FAILED: {module_name}")
        traceback.print_exc()

debug_import("transformers")
debug_import("peft")
debug_import("diffusers")
