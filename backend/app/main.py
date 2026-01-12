from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Import your routers
# Note: Ensure the file name in app/api/ is actually 'sponser.py'.
# If it is 'sponsors.py', change this import to 'sponsors'.
from app.api import auth, sponser, admin, event, users, groups

app = FastAPI(title="Club Management System")

# --- 1. CORS SETUP (The Fix) ---
# We allow specific origins AND regex for local ports to be safe
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

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

# CORS Setup (Allow Frontend + Ngrok)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://localhost:3000",  # Just in case
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Allow ngrok and other tunneling services
    allow_origin_regex=r"https?://.*\.(ngrok-free\.dev|ngrok\.io|ngrok-free\.app|localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. STATIC FILES ---
# Ensure directories exist so the app doesn't crash on startup
os.makedirs("static/generated_posters", exist_ok=True)
os.makedirs("../uploads/profile_pictures", exist_ok=True)

# Mount the folders
app.mount("/static", StaticFiles(directory="static"), name="static")
# Note: '..' moves up one level from 'backend/app' to 'backend'
# Adjust depending on where your 'uploads' folder actually sits.
# If uploads is inside backend/, remove the '..'.
app.mount("/uploads", StaticFiles(directory="../uploads"), name="uploads")

# --- 3. ROUTERS ---
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(sponser.router, prefix="/sponsors", tags=["Sponsors"])
app.include_router(admin.router, prefix="/admin", tags=["Admin Control"])
app.include_router(event.router, prefix="/events", tags=["Events"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(groups.router, prefix="/groups", tags=["Groups"])

from app.api import marketing
app.include_router(marketing.router, prefix="/marketing", tags=["EventPulse AI"])

from app.api import prediction
app.include_router(prediction.router, prefix="/predict", tags=["AI Success Predictor"])


@app.get("/")
def read_root():
    return {"message": "Welcome to the Club Management API"}


if __name__ == "__main__":
    import uvicorn

    # Use reload=True for development, False for production
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
