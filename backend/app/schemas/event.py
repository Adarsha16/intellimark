from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    location: str
    date: datetime
    capacity: int
    status: str = "Draft"
    prize_pool: Optional[str] = None
    organizer_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class EventCreate(EventBase):
    pass


class EventOut(EventBase):
    id: int
    marketing_strategy: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
