from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    company: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str


class ProfileResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    company: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=2)
    organization: Optional[str] = None