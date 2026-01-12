
import asyncio
import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

async def test_gemini():
    print(f"Testing Gemini API with Key: {API_KEY[:5]}...{API_KEY[-5:] if API_KEY else 'None'}")
    
    if not API_KEY:
        print("❌ No API Key found in .env")
        return

    # Using the same URL/Model as in the code
    model = "gemini-2.0-flash-exp"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}"
    
    payload = {
        "contents": [{"parts": [{"text": "Rewrite this title: 'Boring Event'"}]}],
        "generationConfig": {
            "temperature": 0.7,
            "responseMimeType": "application/json"
        }
    }
    
    print(f"Requesting URL: {url.split('?')[0]}...")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            
            print(f"Status Code: {response.status_code}")
            if response.status_code != 200:
                print(f"Error Response: {response.text}")
                response.raise_for_status()
                
            data = response.json()
            print("✅ Success!")
            print(json.dumps(data, indent=2))
            
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_gemini())
