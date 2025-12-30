from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, sponser, admin, event, users
from fastapi.staticfiles import StaticFiles
from diffusers import StableDiffusionPipeline
import os
app = FastAPI(title="Club Management System")
# Base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Uploads directory
UPLOADS_DIR = os.path.join(BASE_DIR, "..", "uploads")
os.makedirs(os.path.join(UPLOADS_DIR, "profile_pictures"), exist_ok=True)

# Mount uploads folder
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
# --- 2. AI MODEL INITIALIZATION ---
# Load model globally (CPU mode). 
# Note: This runs once when the server starts.
MODEL_ID = "runwayml/stable-diffusion-v1-5"
print(f"Loading AI Model ({MODEL_ID}) to CPU... this may take a minute.")

try:
    pipe = StableDiffusionPipeline.from_pretrained(
        MODEL_ID, 
        torch_dtype=torch.float32,
        use_safetensors=True
    )
    pipe.to("cpu")
    print("AI Model loaded successfully.")
except Exception as e:
    print(f"Failed to load AI model: {e}")
    pipe = None
    
# CORS Setup (Allow Frontend)
origins = ["http://localhost:5173"]  # Vite default port
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(sponser.router, prefix="/sponsors", tags=["Sponsors"])
app.include_router(admin.router, prefix="/admin", tags=["Admin Control"])
app.include_router(event.router, prefix="/events", tags=["Events"])
app.include_router(users.router, prefix="/users", tags=["Users"])

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Club Management API",
        "ai_status": "Ready" if pipe else "Offline"
    }

@app.post("/generate-art", tags=["AI Generation"])
async def generate_image(prompt: str):
    """
    Generate an image using Stable Diffusion on CPU.
    This is useful for generating event posters or profile backgrounds.
    """
    if pipe is None:
        raise HTTPException(status_code=503, detail="AI Model not loaded")
    
    try:
        # num_inference_steps is low (15) to keep CPU generation time reasonable
        # increase to 30-50 for better quality if you have a fast CPU
        image = pipe(prompt, num_inference_steps=15).images[0]
        
        # Save image to a byte buffer
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        buf.seek(0)
        
        return StreamingResponse(buf, media_type="image/png")
    
    except Exception as e:
        print(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail="Image generation failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False) 
    # Note: reload=False is recommended when loading large AI models to prevent 
    # constant reloading of the 4GB+ model into RAM during development.