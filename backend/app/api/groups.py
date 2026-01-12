from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.db.session import get_db
from app.models.group import Group
from app.models.user import User
from app.schemas.group import GroupCreate, GroupOut
from app.api.deps import get_current_admin

router = APIRouter()


# 1. Get All Groups
@router.get("/", response_model=List[GroupOut])
async def get_groups(db: AsyncSession = Depends(get_db)):
    # selectinload is needed to fetch the 'members' relationship efficiently
    result = await db.execute(select(Group).options(selectinload(Group.members)))
    return result.scalars().all()


# 2. Create Group (Admin Only)
@router.post("/", response_model=GroupOut)
async def create_group(
    group: GroupCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    # 1. Check if group exists
    result = await db.execute(select(Group).where(Group.name == group.name))
    if result.scalars().first():
        raise HTTPException(
            status_code=400, detail=f"Group '{group.name}' already exists."
        )

    # 2. Create new group
    new_group = Group(name=group.name, description=group.description)
    db.add(new_group)
    await db.commit()

    # 3. Reload with relationships (The fix from before)
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.members))
        .where(Group.id == new_group.id)
    )
    return result.scalars().first()


# 2.5 Update Group (Admin Only)
@router.put("/{group_id}", response_model=GroupOut)
async def update_group(
    group_id: int,
    group_data: GroupCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    result = await db.execute(select(Group).where(Group.id == group_id).options(selectinload(Group.members)))
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    group.name = group_data.name
    group.description = group_data.description
    
    await db.commit()
    await db.refresh(group)
    return group


# 3. Add Member to Group
@router.post("/{group_id}/add/{user_email}")
async def add_member(
    group_id: int,
    user_email: str,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    # Fetch Group
    g_res = await db.execute(
        select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    )
    group = g_res.scalars().first()
    if not group:
        raise HTTPException(404, "Group not found")

    # Fetch User
    u_res = await db.execute(select(User).where(User.email == user_email))
    user = u_res.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")

    # Add Logic
    if user in group.members:
        raise HTTPException(400, "User already in group")

    group.members.append(user)
    await db.commit()
    return {"message": f"Added {user.email} to {group.name}"}


# 4. Remove Member
@router.delete("/{group_id}/remove/{user_id}")
async def remove_member(
    group_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    g_res = await db.execute(
        select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    )
    group = g_res.scalars().first()
    if not group:
        raise HTTPException(404, "Group not found")

    # Find member in list
    member_to_remove = next((u for u in group.members if u.id == user_id), None)
    if not member_to_remove:
        raise HTTPException(404, "User not in this group")

    group.members.remove(member_to_remove)
    await db.commit()
    return {"message": "Member removed"}


# 5. Delete Group
@router.delete("/{group_id}")
async def delete_group(
    group_id: int, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)
):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalars().first()
    if not group:
        raise HTTPException(404, "Group not found")

    await db.delete(group)
    await db.commit()
    return {"message": "Group deleted"}
