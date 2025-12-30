from sqlalchemy import Column, Integer, String, DateTime, Text, Enum
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

    # For AI Marketing Strategy (Stored as JSON string or simple text for now)
    marketing_strategy = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
