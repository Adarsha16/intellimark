from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.db.session import get_db
from app.models.event import Event
from app.schemas.event import EventCreate, EventOut
from app.core.logger import log_activity
from app.api.deps import get_current_user
from app.models.sponser import Sponsor
from app.services.matcher import calculate_matches
from app.db.session import (
    get_db,
    AsyncSessionLocal,
)  # Ensure you have a session factory
from app.services.poster_gen.generate_base_sdxl import generate_event_poster
from app.services.progress_tracker import ProgressTracker
import asyncio


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
    new_event = Event(**event.dict(), location_name=event.location)
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


@router.get("/{event_id}/match-sponsors")
async def match_sponsors_for_event(event_id: int, db: AsyncSession = Depends(get_db)):
    # 1. Fetch the Event
    result_event = await db.execute(select(Event).where(Event.id == event_id))
    event = result_event.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # 2. Fetch All Sponsors
    result_sponsors = await db.execute(select(Sponsor))
    sponsors = result_sponsors.scalars().all()

    # 3. Prepare Text for Matching
    # Combining title, description, and location gives the AI more context
    event_text = f"{event.title}. {event.description}. Located at {event.location}."

    # 4. Run AI Matching
    matches = calculate_matches(event_text, sponsors)

    return matches


@router.put("/{event_id}", response_model=EventOut)
async def update_event(
    event_id: int, event_data: EventCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Update fields (convert date string to datetime if needed, pydantic handles mostly)
    for key, value in event_data.dict().items():
        setattr(event, key, value)

    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/{event_id}")
async def delete_event(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    await db.delete(event)
    await db.commit()
    return {"message": "Event deleted"}


@router.post("/{event_id}/generate-poster")
async def generate_poster_api(
    event_id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)
):
    # 1. Fetch Event
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # 2. Extract primitive data (Strings) to pass to background task
    # We do NOT pass the SQLAlchemy 'event' object because it expires when this request ends.
    e_id = event.id
    e_title = event.title
    e_date = str(event.date)
    e_loc = event.location
    e_desc = event.description
    e_prize = event.prize_pool
    e_org = event.organizer_name

    # 3. Define the Background Worker
    async def background_worker(eid, title, date, loc, desc, prize, org):
        # Run the CPU-heavy generation in a separate thread loop
        loop = asyncio.get_running_loop()

        try:
            image_url = await loop.run_in_executor(
                None, generate_event_poster, title, date, loc, desc, "modern", prize, org, eid
            )

            # Open a NEW database session to save the result
            async with AsyncSessionLocal() as session:
                res = await session.execute(select(Event).where(Event.id == eid))
                ev = res.scalars().first()
                if ev:
                    # Append to strategy field
                    # Clean existing poster lines to prevent infinite append
                    current_strategy = ev.marketing_strategy or ""
                    cleaned_strategy = "\n".join([
                        line for line in current_strategy.split('\n') 
                        if "**Poster:**" not in line
                    ]).strip()
                    
                    ev.marketing_strategy = cleaned_strategy + f"\n\n**Poster:** {image_url}"
                    await session.commit()
                    print(f"Database updated for Event {eid}")
                    ProgressTracker.set_progress(eid, 100, "Generation Complete")
        except Exception as e:
            ProgressTracker.set_progress(eid, 0, f"Error: {str(e)}")
            print(f"Poster Generation Failed: {e}")

    # 4. Queue the task
    background_tasks.add_task(background_worker, e_id, e_title, e_date, e_loc, e_desc, e_prize, e_org)

    return {"message": "Poster generation started. It will take ~30-60 seconds."}


@router.get("/{event_id}/progress")
async def get_generation_progress(event_id: int):
    status = ProgressTracker.get_progress(event_id)
    return status
