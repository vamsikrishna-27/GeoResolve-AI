from typing import Optional
from pydantic import BaseModel

class ApiKeyCreate(BaseModel):
    name: str

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    token: Optional[str] = None # Only returned once during creation
    status: str
    usage: int
    max_limit: int
    expiry: Optional[str] = None
    created_at: str
