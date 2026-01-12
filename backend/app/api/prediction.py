"""
API endpoints for AI Event Success Predictor
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.event import Event
from app.models.user import User
from app.schemas.prediction import SuccessPrediction
from app.services.success_predictor import predict_event_success

router = APIRouter()


@router.get("/{event_id}", response_model=SuccessPrediction)
async def get_success_prediction(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI-powered success prediction for an event.
    Analyzes multiple factors and returns a comprehensive prediction.
    """
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    prediction = predict_event_success(event)
    return prediction
