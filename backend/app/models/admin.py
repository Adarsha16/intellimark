from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, nullable=False)  # e.g., "Created Sponsor", "Deleted User"
    details = Column(Text, nullable=True)  # JSON or text details
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="logs")


# Update User model to include relationship (Optional but good practice)
from app.models.user import User

User.logs = relationship("ActivityLog", back_populates="user")
