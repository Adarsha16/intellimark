import asyncio
import os
import sys
import json
import urllib.request
from urllib.parse import urlencode

# Ensure we can import from app
sys.path.append(os.getcwd())

from app.services.poster_gen.ai_keyword_generator import AIPromptGenerator

def list_available_models():
    output_path = "models_log.txt"
    log_file = open(output_path, "w", encoding="utf-8")
    
    def log(msg):
        print(msg)
        log_file.write(msg + "\n")

    log("\n🔍 Listing Available Gemini Models...\n")
    generator = AIPromptGenerator()
    key = generator.api_key
    
    if not key:
        log("❌ ERROR: No GEMINI_API_KEY found.")
        return

    url = f"https://generativelanguage.googleapis.com/v1beta/models"
    params = {"key": key}
    full_url = f"{url}?{urlencode(params)}"
    
    log(f"📡 Requesting: {url}...")
    
    try:
        with urllib.request.urlopen(full_url) as response:
            if response.status != 200:
                log(f"❌ HTTP Error: {response.status}")
                return

            data = json.loads(response.read().decode("utf-8"))
            models = data.get("models", [])
            
            log(f"✅ Found {len(models)} models:\n")
            
            # Filter for generateContent support
            content_models = []
            for m in models:
                methods = m.get("supportedGenerationMethods", [])
                if "generateContent" in methods:
                    clean_name = m['name'].replace("models/", "")
                    content_models.append(clean_name)
                    log(f"  • {clean_name}")
            
            log("\n💡 Suggested for config:")
            log(f"  FLASH: {[m for m in content_models if 'flash' in m]}")
            log(f"  PRO:   {[m for m in content_models if 'pro' in m]}")

    except Exception as e:
        log(f"❌ Request Failed: {e}")
        try:
             if hasattr(e, 'read'):
                log(f"   Body: {e.read().decode('utf-8')}")
        except:
            pass
    finally:
        log_file.close()
        print(f"\nSaved to {output_path}")

if __name__ == "__main__":
    list_available_models()
