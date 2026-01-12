import os
import io
import torch
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from PIL import Image, ImageDraw, ImageFont

# Import your existing components

app = FastAPI()

# --- DIRECTORIES ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "..", "uploads")
POSTERS_DIR = os.path.join(UPLOADS_DIR, "posters")
os.makedirs(POSTERS_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# --- AI MODEL INITIALIZATION ---
MODEL_ID = "runwayml/stable-diffusion-v1-5"
LORA_PATH = os.path.join(BASE_DIR, "lora_output")

print("Loading AI Model...")
pipe = StableDiffusionPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.float32)
pipe.to("cpu")

# Load LoRA if exists
if os.path.exists(LORA_PATH):
    pipe.unet = PeftModel.from_pretrained(pipe.unet, LORA_PATH)
    print("LoRA Strategy Loaded.")

# --- BACKEND OVERLAY LOGIC ---
def overlay_text_on_poster(img_bytes, title, date_str, location):
    """Stamps professional text onto the AI generated image"""
    img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    draw = ImageDraw.Draw(img)
    width, height = img.size

    # 1. Attempt to load a font, fallback to default
    try:
        # Check common font paths for 2026 systems
        font_path = "arial.ttf" if os.name == 'nt' else "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        title_font = ImageFont.truetype(font_path, 45)
        detail_font = ImageFont.truetype(font_path, 22)
    except:
        title_font = ImageFont.load_default()
        detail_font = ImageFont.load_default()

    # 2. Draw a semi-transparent black gradient/box at the bottom for readability
    overlay = Image.new('RGBA', img.size, (0,0,0,0))
    ov_draw = ImageDraw.Draw(overlay)
    ov_draw.rectangle([0, height-130, width, height], fill=(0, 0, 0, 180))
    img = Image.alpha_composite(img, overlay)
    
    # 3. Draw the Text
    draw = ImageDraw.Draw(img)
    # Event Title (Main)
    draw.text((40, height-110), title.upper(), font=title_font, fill=(255, 255, 255))
    # Event Details (Sub)
    draw.text((40, height-50), f"🗓 {date_str}  |  📍 {location}", font=detail_font, fill=(200, 200, 255))

    return img.convert("RGB")

# --- THE MAIN GENERATION FUNCTION ---
async def create_event_poster_internal(event_id: int, db_session: AsyncSession):
    """Internal function to handle AI + Overlay + Saving"""
    # 1. Get Event Details
    result = await db_session.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()
    if not event: return

    print(f"Generating poster for: {event.title}")

    # 2. AI Generate Background
    # Using specific 'no text' keywords to keep the background clean
    prompt = f"Professional background for a {event.title} event, cinematic lighting, high quality, 4k, clean, no text, minimalist"
    ai_image = pipe(prompt, num_inference_steps=20).images[0]

    # 3. Save to Bytes for processing
    buf = io.BytesIO()
    ai_image.save(buf, format="PNG")
    
    # 4. Apply the Text Overlay
    final_poster = overlay_text_on_poster(
        buf.getvalue(), 
        event.title, 
        str(event.date.strftime("%B %d, %Y")), 
        event.location
    )

    # 5. Save the final file to the uploads/posters folder
    file_path = os.path.join(POSTERS_DIR, f"event_{event.id}.jpg")
    final_poster.save(file_path, "JPEG", quality=90)
    print(f"Poster saved to: {file_path}")

# --- EXAMPLE: Integration into existing Event Creation ---
# You can call this inside your existing @router.post("/") for events
# Or keep it as a background task so the API remains fast.

@app.post("/events/{event_id}/generate-marketing")
async def trigger_poster_generation(event_id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # Start the heavy AI work in the background so the user doesn't wait 3 minutes
    background_tasks.add_task(create_event_poster_internal, event_id, db)
    return {"message": "AI Poster generation started in the background."}