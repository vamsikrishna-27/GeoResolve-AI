import uuid
from typing import Optional
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import User
from app.core.security import verify_access_token, global_rate_limiter
from app.repositories.api_keys import ApiKeyRepository

security = HTTPBearer(auto_error=False)
api_key_repo = ApiKeyRepository()

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """
    Extracts Bearer token from request headers, decodes JWT, 
    and returns user profile details from the database.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session Authorization credentials missing. Pass Bearer JWT token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    
    # 1. Verify JWT signature locally using our secret key
    payload = verify_access_token(token)
    user_id_str = payload.get("sub")
    
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User identity claim missing from session token."
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identity format in session token."
        )

    # 2. Fetch User metadata from the database
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session profile not found in database."
        )

    return {
        "id": str(db_user.id),
        "email": db_user.email,
        "role": db_user.role,
        "name": db_user.name,
        "company": db_user.company
    }

async def get_current_user_or_api_key(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """
    Validates token sessions via JWT authorization headers OR X-API-KEY header keys.
    Returns: A standard session dictionary containing user_id and authorization source metadata.
    """
    # 1. First check X-API-KEY header
    api_key = request.headers.get("X-API-KEY")
    if api_key:
        is_valid, record, err = await api_key_repo.validate_key(api_key, db)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=err or "Invalid API Key"
            )
        return {
            "id": str(record["user_id"]),
            "role": "Developer",
            "name": f"API Key: {record['name']}",
            "api_key_id": str(record["id"]),
            "auth_type": "api_key"
        }

    # 2. Fallback to standard Bearer token (JWT check)
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session Authorization credentials missing. Pass JWT tokens or X-API-KEY headers."
        )

    user = await get_current_user(credentials, db)
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
