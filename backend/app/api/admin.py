from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.models.admin import ActivityLog
from app.models.event import Event
from app.services.strategy_agent import generate_club_strategy
from app.services.pdf_generator import create_executive_pdf
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


@router.post("/export-report")
async def export_pdf_report(data: dict, admin: User = Depends(get_current_admin)):
    stats = data.get("stats", {})
    strategy = data.get("strategy", "No strategy generated.")

    # Call the generator
    relative_path = create_executive_pdf(stats, strategy)

    # Ensure URL starts with /
    return {"url": f"/{relative_path}"}


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


@router.post("/generate-strategy")
async def get_ai_strategy_report(
    db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
):
    """
    Analyzes club data (Events + Sponsors) to produce a strategic roadmap.
    """
    report = await generate_club_strategy(db)
    return {"report": report}


@router.post("/backup")
async def trigger_backup(admin: User = Depends(get_current_admin)):
    # Simulation of a database dump
    return {
        "message": "Backup started successfully. You will receive an email upon completion."
    }


@router.get("/stats/trend")
async def get_activity_trend(
    db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
):
    """
    Returns monthly count of new Events and new Users (Members) for the last 6 months.
    """
    from sqlalchemy import func, extract
    import datetime

    # We will get data for the last 6 months
    today = datetime.date.today()
    six_months_ago = today - datetime.timedelta(days=180)

    # 1. Aggregate Events by Month
    events_result = await db.execute(
        select(
            func.to_char(Event.created_at, 'Mon').label("month"),
            func.count(Event.id).label("count")
        )
        .where(Event.created_at >= six_months_ago)
        .group_by(func.to_char(Event.created_at, 'Mon'))
    )
    
    # 2. Aggregate Users by Month
    users_result = await db.execute(
        select(
            func.to_char(User.created_at, 'Mon').label("month"),
            func.count(User.id).label("count")
        )
        .where(User.created_at >= six_months_ago)
        .group_by(func.to_char(User.created_at, 'Mon'))
    )

    # Process results into a dictionary
    data_map = {}
    
    # Initialize with last 6 months (empty)
    for i in range(5, -1, -1):
        d = today - datetime.timedelta(days=i*30)
        month_name = d.strftime("%b")
        data_map[month_name] = {"month": month_name, "events": 0, "users": 0, "sort": d}

    # Fill Events
    for row in events_result.all():
        m = row.month
        c = row.count
        if m in data_map:
            data_map[m]["events"] = c
    
    # Fill Users
    for row in users_result.all():
        m = row.month
        c = row.count
        if m in data_map:
            data_map[m]["users"] = c

    # Sort by date
    trend_data = sorted(data_map.values(), key=lambda x: x["sort"])

    # Clean up sort key for response
    for item in trend_data:
        del item["sort"]

    return trend_data
