import sys
import os

sys.path.append(os.getcwd())

print("Attempting to import ai_keyword_generator...")
try:
    from app.services.poster_gen import ai_keyword_generator
    print("✅ Import SUCCESS")
except Exception as e:
    print(f"❌ Import FAILED: {e}")
    import traceback
    traceback.print_exc()
