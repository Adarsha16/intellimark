from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.db.session import get_db
from app.models.event import Event
from app.schemas.event import EventCreate, EventOut
from app.core.logger import log_activity
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[EventOut])
async def get_events(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).order_by(Event.date.asc()))
    return result.scalars().all()


@router.post("/", response_model=EventOut)
async def create_event(
    event: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    new_event = Event(**event.dict())
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)
    await log_activity(db, current_user.id, "Created Event", f"Title: {event.title}")
    return new_event


@router.post("/{event_id}/generate-strategy")
async def generate_ai_strategy(event_id: int, db: AsyncSession = Depends(get_db)):
    """
    Mock AI Endpoint: Analyzes event data and suggests marketing.
    In a real app, this would call OpenAI/LangChain.
    """
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Simple Rule-Based Logic (The "AI")
    strategy = (
        f"🚀 **Strategy for {event.title}**:\n"
        f"1. Post on Instagram 3 days before ({event.date.date()}).\n"
        f"2. Target Audience: Students interested in {event.location}.\n"
        f"3. Suggested Caption: 'Join us at {event.location} for an amazing experience!'"
    )

    event.marketing_strategy = strategy
    await db.commit()
    return {"strategy": strategy}
