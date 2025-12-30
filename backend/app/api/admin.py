from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.models.admin import ActivityLog
from app.api.deps import get_current_admin
from app.core.logger import log_activity

router = APIRouter()


# --- Schemas ---
class UserListOut(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LogOut(BaseModel):
    id: int
    action: str
    details: str | None
    timestamp: datetime
    user_email: str


class AdminMeOut(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Endpoints ---


@router.get("/users", response_model=List[UserListOut])
async def get_all_users(
    db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(User))
    return result.scalars().all()

@router.get("/me", response_model=AdminMeOut)
async def get_current_admin_user(
    admin: User = Depends(get_current_admin),
):
    return admin

@router.put("/users/{user_id}/role")
async def change_user_role(
    user_id: int,
    role: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if role not in ["admin", "member", "manager"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = role
    await db.commit()
    await log_activity(
        db, admin.id, "Changed Role", f"Changed user {user.email} to {role}"
    )
    return {"message": "Role updated"}


@router.get("/logs", response_model=List[LogOut])
async def get_system_logs(
    db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
):
    # Join logs with users to get email
    result = await db.execute(
        select(ActivityLog, User.email)
        .join(User, ActivityLog.user_id == User.id)
        .order_by(ActivityLog.timestamp.desc())
        .limit(50)
    )

    logs = []
    for log, email in result:
        logs.append(
            LogOut(
                id=log.id,
                action=log.action,
                details=log.details,
                timestamp=log.timestamp,
                user_email=email,
            )
        )
    return logs


@router.post("/backup")
async def trigger_backup(admin: User = Depends(get_current_admin)):
    # Simulation of a database dump
    return {
        "message": "Backup started successfully. You will receive an email upon completion."
    }
