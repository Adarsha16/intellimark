from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from sqlalchemy.sql import func
from app.db.base import Base


class Sponsor(Base):
    __tablename__ = "sponsors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    contact_email = Column(String, nullable=False)
    company_name = Column(String, nullable=False)
    status = Column(
        String, default="Potential"
    )  # Potential, Contacted, Negotiating, Secured
    total_funding = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
