import asyncio
from typing import Optional
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.dependencies.supabase import get_supabase_client, get_supabase_admin_client
from app.core.security import verify_supabase_jwt
from app.repositories.api_keys import ApiKeyRepository

security = HTTPBearer(auto_error=False)
api_key_repo = ApiKeyRepository()

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    Extracts Bearer token from request headers, decodes JWT, 
    and returns user profile details from database.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session Authorization credentials missing. Pass Bearer JWT token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    
    # 1. Verify JWT signature locally or with Supabase Auth
    payload = verify_supabase_jwt(token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User identity claim missing from session token."
        )

    # 2. Fetch User metadata from public profile table (to retrieve role / company)
    admin_client = get_supabase_admin_client()
    try:
        query = admin_client.table("users").select("*").eq("id", user_id)
        response = await asyncio.to_thread(query.execute)
        if response.data and len(response.data) > 0:
            user_profile = response.data[0]
            # Bind session email to profile data
            user_profile["email"] = payload.get("email")
            return user_profile
    except Exception:
        pass
        
    # Return basic user structure if db fetch failed but JWT is verified
    return {
        "id": user_id,
        "email": payload.get("email"),
        "role": "User",
        "name": payload.get("email", "User").split("@")[0]
    }

async def get_current_user_or_api_key(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    Validates token sessions via JWT authorization headers OR X-API-KEY header keys.
    Returns: A standard session dictionary containing user_id and authorization source metadata.
    """
    # 1. First check X-API-KEY header
    api_key = request.headers.get("X-API-KEY")
    if api_key:
        is_valid, record, err = await api_key_repo.validate_key(api_key)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=err or "Invalid API Key"
            )
        return {
            "id": record["user_id"],
            "role": "Developer",
            "name": f"API Key: {record['name']}",
            "api_key_id": record["id"],
            "auth_type": "api_key"
        }

    # 2. Fallback to standard Bearer token (JWT check)
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session Authorization credentials missing. Pass JWT tokens or X-API-KEY headers."
        )

    user = await get_current_user(credentials)
    user["auth_type"] = "jwt"
    return user

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role", "User")
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required permissions: {', '.join(self.allowed_roles)} (current: {user_role})."
            )
        return current_user
