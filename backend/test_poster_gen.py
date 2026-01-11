import sys
import os
import asyncio

# Setup path to import from app
sys.path.append(os.getcwd())

from app.services.poster_gen.generate_base_sdxl import generate_event_poster

print("🚀 Starting Test Generation...")
try:
    url = generate_event_poster(
        title="Cyberpunk 2077 Launch Party",
        date="2026-12-31",
        location="Night City Arcade",
        description="A futuristic gaming tournament with neon vibes and high tech setup.",
        aesthetic="tech"
    )
    print(f"✅ Generated: {url}")
except Exception as e:
    print(f"❌ Failed: {e}")
