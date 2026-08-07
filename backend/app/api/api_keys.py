import secrets
import hashlib
import asyncio
from typing import List
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.supabase import get_supabase_admin_client
from app.dependencies.auth import get_current_user
from app.schemas.api_key import ApiKeyCreate, ApiKeyResponse

router = APIRouter(prefix="/apikeys", tags=["API Key Management"])

@router.get("", response_model=List[ApiKeyResponse])
async def list_api_keys(current_user: dict = Depends(get_current_user)):
    """
    Lists all API Keys belonging to the currently logged in developer account.
    """
    supabase = get_supabase_admin_client()
    try:
        query = supabase.table("api_keys").select("*").eq("user_id", current_user["id"])
        response = await asyncio.to_thread(query.execute)
        keys_list = []
        for item in response.data:
            keys_list.append(ApiKeyResponse(
                id=item["id"],
                name=item["name"],
                status=item["status"],
                usage=item["usage"],
                max_limit=item["max_limit"],
                expiry=item["expiry"],
                created_at=item["created_at"]
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
    current_user: dict = Depends(get_current_user)
):
    """
    Generates a new secure API Key, hashes it, and registers it.
    The raw token is returned ONLY once in this response payload.
    """
    supabase = get_supabase_admin_client()
    
    # 1. Generate secure random key starting with 'gr_live_'
    random_hex = secrets.token_hex(16) # 32 hex chars
    raw_token = f"gr_live_{random_hex}"
    
    # 2. Hash it for DB matching
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    
    expiry_date = (date.today() + timedelta(days=365)).isoformat() # 1 year expiry

    key_record = {
        "user_id": current_user["id"],
        "name": key_data.name,
        "token_hash": token_hash,
        "status": "Active",
        "usage": 0,
        "max_limit": 25000,
        "expiry": expiry_date
    }

    try:
        query = supabase.table("api_keys").insert(key_record)
        response = await asyncio.to_thread(query.execute)
        if response.data:
            created_item = response.data[0]
            return ApiKeyResponse(
                id=created_item["id"],
                name=created_item["name"],
                token=raw_token, # Send raw token ONLY ONCE during creation
                status=created_item["status"],
                usage=created_item["usage"],
                max_limit=created_item["max_limit"],
                expiry=created_item["expiry"],
                created_at=created_item["created_at"]
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate API key: {str(e)}"
        )
        
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Could not generate API key."
    )

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_api_key(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Permanently revokes and removes the selected API key.
    """
    supabase = get_supabase_admin_client()
    try:
        # Check ownership first
        check_query = supabase.table("api_keys").select("user_id").eq("id", id)
        check_res = await asyncio.to_thread(check_query.execute)
        if not check_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API Key not found."
            )
            
        if check_res.data[0]["user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own this API key."
            )

        delete_query = supabase.table("api_keys").delete().eq("id", id)
        await asyncio.to_thread(delete_query.execute)
        return {"detail": "API Key deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete API key: {str(e)}"
        )
