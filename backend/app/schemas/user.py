from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr

class UserProfileOut(BaseModel):
    id: int
    email: str
    name: Optional[str]
    phone: Optional[str]
    bio: Optional[str]
    profile_picture: Optional[str]
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
        
class UserProfileUpdate(BaseModel):
    name: Optional[str]
    phone: Optional[str]
    bio: Optional[str]

class UserCreate(UserBase):
    password: str
    role: str = "member"


class UserOut(UserBase):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str

