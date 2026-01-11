from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, Float
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class EventStatus(str, enum.Enum):
    DRAFT = "Draft"
    PUBLISHED = "Published"
    COMPLETED = "Completed"


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String, nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    capacity = Column(Integer, default=0)
    status = Column(String, default=EventStatus.DRAFT)
    
    # Official Fields
    prize_pool = Column(String, nullable=True) # e.g. "$10,000"
    organizer_name = Column(String, nullable=True) # e.g. "IntelliMark Gaming"

    # For AI Marketing Strategy (Stored as JSON string or simple text for now)
    marketing_strategy = Column(Text, nullable=True)
    
    # AR / Geolocation
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
