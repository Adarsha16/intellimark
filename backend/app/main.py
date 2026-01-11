from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, sponser, admin, event, users, groups
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

os.makedirs("static/generated_posters", exist_ok=True)

# 3. Mount the "static" folder to the "/static" URL
app.mount("/static", StaticFiles(directory="static"), name="static")
# --- 2. AI MODEL INITIALIZATION ---
# Load model globally (CPU mode).
# Note: This runs once when the server starts.

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
app.include_router(groups.router, prefix="/groups", tags=["Groups"])


@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Club Management API",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
    # Note: reload=False is recommended when loading large AI models to prevent
    # constant reloading of the 4GB+ model into RAM during development.
