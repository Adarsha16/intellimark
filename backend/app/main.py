from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, sponser, admin, event

app = FastAPI(title="Club Management System")

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


@app.get("/")
def read_root():
    return {"message": "Welcome to the Club Management API"}
