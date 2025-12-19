from sqlalchemy.ext.asyncio import AsyncSession
from app.models.admin import ActivityLog


async def log_activity(
    db: AsyncSession, user_id: int, action: str, details: str = None
):
    new_log = ActivityLog(user_id=user_id, action=action, details=details)
    db.add(new_log)
    await db.commit()
