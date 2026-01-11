from pydantic import BaseModel
from typing import List, Optional


class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None


class GroupCreate(GroupBase):
    pass


class GroupMember(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True


class GroupOut(GroupBase):
    id: int
    members: List[GroupMember] = []

    class Config:
        from_attributes = True
