import secrets
import hashlib
import uuid
from typing import List
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import ApiKey
from app.dependencies.auth import get_current_user
from app.schemas.api_key import ApiKeyCreate, ApiKeyResponse

router = APIRouter(prefix="/apikeys", tags=["API Key Management"])

@router.get("", response_model=List[ApiKeyResponse])
async def list_api_keys(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all API Keys belonging to the currently logged in developer account.
    """
    try:
        user_uuid = uuid.UUID(current_user["id"])
        db_keys = db.query(ApiKey).filter(ApiKey.user_id == user_uuid).all()
        
        keys_list = []
        for item in db_keys:
            keys_list.append(ApiKeyResponse(
                id=str(item.id),
                name=item.name,
                status=item.status,
                usage=item.usage_count,
                max_limit=item.max_limit,
                expiry=item.expiry.isoformat() if item.expiry else None,
                created_at=item.created_at.isoformat()
            ))
        return keys_list
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch API keys: {str(e)}"
        )

@router.post("", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def generate_api_key(
    key_data: ApiKeyCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a new secure API Key, hashes it, and registers it.
    The raw token is returned ONLY once in this response payload.
    """
    try:
        user_uuid = uuid.UUID(current_user["id"])
        
        # 1. Generate secure random key starting with 'gr_live_'
        random_hex = secrets.token_hex(16)
        raw_token = f"gr_live_{random_hex}"
        
        # 2. Hash it for DB matching
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        expiry_date = date.today() + timedelta(days=365) # 1 year expiry

        new_key = ApiKey(
            user_id=user_uuid,
            name=key_data.name,
            token_hash=token_hash,
            status="Active",
            usage_count=0,
            max_limit=25000,
            expiry=expiry_date
        )

        db.add(new_key)
        db.commit()
        db.refresh(new_key)

        return ApiKeyResponse(
            id=str(new_key.id),
            name=new_key.name,
            token=raw_token, # Send raw token ONLY ONCE during creation
            status=new_key.status,
            usage=new_key.usage_count,
            max_limit=new_key.max_limit,
            expiry=new_key.expiry.isoformat() if new_key.expiry else None,
            created_at=new_key.created_at.isoformat()
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate API key: {str(e)}"
        )

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_api_key(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permanently revokes and removes the selected API key.
    """
    try:
        key_uuid = uuid.UUID(id)
        user_uuid = uuid.UUID(current_user["id"])
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid API key ID format."
        )

    try:
        # Check ownership first
        db_key = db.query(ApiKey).filter(ApiKey.id == key_uuid).first()
        if not db_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API Key not found."
            )
            
        if db_key.user_id != user_uuid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own this API key."
            )

        db.delete(db_key)
        db.commit()
        return {"detail": "API Key deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete API key: {str(e)}"
        )
