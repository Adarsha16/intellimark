from pydantic import BaseModel
from typing import Optional


class SponsorBase(BaseModel):
    name: str
    contact_email: str
    company_name: str
    status: Optional[str] = "Potential"
    total_funding: Optional[float] = 0.0
    notes: Optional[str] = None


class SponsorCreate(SponsorBase):
    pass


class SponsorOut(SponsorBase):
    id: int

    class Config:
        from_attributes = True
