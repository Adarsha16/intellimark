
import os
import sys

# Add app to path
sys.path.append(os.getcwd())

try:
    from app.core.config import settings
    print(f"API KEY PRESENT: {bool(settings.GEMINI_API_KEY)}")
    if settings.GEMINI_API_KEY:
        print(f"Key start: {settings.GEMINI_API_KEY[:4]}")
    else:
        print("Key is None or Empty")
except Exception as e:
    print(f"Error loading settings: {e}")
