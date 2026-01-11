import asyncio
import os
import sys

# Ensure we can import from app
sys.path.append(os.getcwd())

from app.services.poster_gen.ai_keyword_generator import AIPromptGenerator, ModelVersion

async def test_generation():
    print("\n🔮 Testing Gemini 3.0 API Connectivity...\n")
    generator = AIPromptGenerator()
    
    # 1. Check Config
    key = generator.api_key
    masked_key = f"{key[:4]}...{key[-4:]}" if key else "None"
    print(f"🔑 API Key: {masked_key}")
    print(f"📋 Model Order: {[m.value for m in generator.MODEL_PRIORITY]}")
    
    if not key:
        print("❌ ERROR: No GEMINI_API_KEY found in .env or settings.")
        return

    # 2. Generate
    print("\n🚀 Sending test request to Gemini 3.0...")
    prompt = "Title: Tech Innovations. Description: A deep dive into future 2026 tech."
    
    # We call the internal method to get the full result object for inspection
    result = generator.generate_visual_prompt(prompt)
    
    print("\n" + "="*40)
    print("              RESULT              ")
    print("="*40)
    
    if result.success:
        print(f"✅ SUCCESS!")
        print(f"🤖 Model Used: {result.model_used}")
        print(f"⏱️ Time: {result.generation_time_ms:.2f}ms")
        print(f"📝 Prompt: {result.prompt}")
    else:
        print(f"❌ FAILED.")
        print(f"⚠️ Error: {result.error}")
        print(f"📉 Fallback Used: {result.fallback_used}")
        
    print("="*40 + "\n")

if __name__ == "__main__":
    asyncio.run(test_generation())
