from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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


@router.put("/{sponsor_id}", response_model=SponsorOut)
async def update_sponsor(
    sponsor_id: int, sponsor_data: SponsorCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Sponsor).where(Sponsor.id == sponsor_id))
    sponsor = result.scalars().first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")

    # Update fields
    for key, value in sponsor_data.dict().items():
        setattr(sponsor, key, value)

    await db.commit()
    await db.refresh(sponsor)
    return sponsor


@router.delete("/{sponsor_id}")
async def delete_sponsor(sponsor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Sponsor).where(Sponsor.id == sponsor_id))
    sponsor = result.scalars().first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")

    await db.delete(sponsor)
    await db.commit()
    return {"message": "Sponsor deleted"}
