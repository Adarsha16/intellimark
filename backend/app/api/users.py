from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.user import UserProfileOut, UserProfileUpdate
import os
import shutil
import aiofiles

router = APIRouter()

# Absolute path for uploads
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "..", "..", "uploads", "profile_pictures")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --------------------------
# Get current user profile
# --------------------------
@router.get("/me", response_model=UserProfileOut)
async def get_my_profile(user: User = Depends(get_current_user)):
    return user

# --------------------------
# Update profile fields
# --------------------------
@router.put("/me", response_model=UserProfileOut)
async def update_my_profile(
    update: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    for field, value in update.dict(exclude_unset=True).items():
        setattr(user, field, value)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

# --------------------------
# Upload profile picture
# --------------------------
@router.post("/me/upload-profile-picture", response_model=UserProfileOut)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Validate file type
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".png", ".jpg", ".jpeg", ".gif", ".webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PNG, JPG, JPEG, GIF, and WEBP are allowed.")

    # Delete old profile picture if exists
    if user.profile_picture:
        old_file_path = os.path.join(BASE_DIR, "..", "..", "uploads", user.profile_picture)
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except Exception as e:
                print(f"Could not delete old profile picture: {e}")

    # Generate unique filename
    filename = f"user_{user.id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Write file asynchronously
    try:
        async with aiofiles.open(file_path, 'wb') as buffer:
            content = await file.read()
            await buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Update user profile picture path
    user.profile_picture = f"profile_pictures/{filename}"
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user

@router.delete("/me/profile-picture")
async def delete_profile_picture(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete the current user's profile picture."""
    
    if not user.profile_picture:
        raise HTTPException(status_code=404, detail="No profile picture to delete")
    
    # Delete file from filesystem
    file_path = os.path.join(BASE_DIR, "..", "..", "uploads", user.profile_picture)
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Warning: Could not delete profile picture file: {e}")
    
    # Update database
    user.profile_picture = None
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return {"message": "Profile picture deleted successfully"}