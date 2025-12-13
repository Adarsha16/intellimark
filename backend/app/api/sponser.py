from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.db.session import get_db
from app.schemas.sponser import SponsorCreate, SponsorOut
from app.models.sponser import Sponsor

router = APIRouter()


@router.post("/", response_model=SponsorOut)
async def create_sponsor(sponsor: SponsorCreate, db: AsyncSession = Depends(get_db)):
    new_sponsor = Sponsor(**sponsor.dict())
    db.add(new_sponsor)
    await db.commit()
    await db.refresh(new_sponsor)
    return new_sponsor


@router.get("/", response_model=List[SponsorOut])
async def get_sponsors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Sponsor))
    return result.scalars().all()
