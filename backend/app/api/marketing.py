from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.event import Event
from app.schemas.marketing import MarketingPlan
from app.services.marketing_generator import generate_marketing_plan, optimize_event_metadata
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/{event_id}/generate", response_model=MarketingPlan)
async def generate_marketing(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # 1. Fetch Event
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # 2. Authorization Check (Optional: Check if user is organizer)
    # For now, we allow any logged-in user to generate marketing for demo purposes
    
    # 3. Generate Plan
    plan = await generate_marketing_plan(event)
    
    return plan

@router.post("/{event_id}/optimize")
async def optimize_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Generate optimized metadata
    new_meta = await optimize_event_metadata(event)
    
    # Update DB
    event.title = new_meta['title']
    event.description = new_meta['description']
    
    await db.commit()
    await db.refresh(event)
    
    return {"success": True, "data": new_meta}
