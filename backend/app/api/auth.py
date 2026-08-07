import asyncio
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.supabase import get_supabase_client, get_supabase_admin_client
from app.dependencies.auth import get_current_user
from app.schemas.auth import UserRegister, UserLogin, TokenSchema, ProfileResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("GeoResolve-AI-Backend")

def _log_detailed_auth_exception(e: Exception, context: str):
    tb = traceback.format_exc()
    http_status = None
    raw_supabase_error = None
    error_code = None
    error_message = str(e)
    response_body = None

    # Try to extract fields if it is a Supabase AuthApiError
    if hasattr(e, "status") and hasattr(e, "message"):
        http_status = getattr(e, "status", None)
        error_message = getattr(e, "message", None)
        error_code = getattr(e, "code", None)
        if hasattr(e, "to_dict"):
            raw_supabase_error = e.to_dict()
            response_body = raw_supabase_error
    
    # Try to extract fields if it is a PostgREST APIError
    elif hasattr(e, "message") and hasattr(e, "code"):
        error_message = getattr(e, "message", None)
        error_code = getattr(e, "code", None)
        details = getattr(e, "details", None)
        hint = getattr(e, "hint", None)
        raw_supabase_error = {
            "message": error_message,
            "code": error_code,
            "details": details,
            "hint": hint
        }
        response_body = raw_supabase_error

    logger.error(
        f"Detailed Exception during {context}:\n"
        f"Full traceback:\n{tb}\n"
        f"HTTP status: {http_status}\n"
        f"Raw Supabase error: {raw_supabase_error}\n"
        f"Error code: {error_code}\n"
        f"Error message: {error_message}\n"
        f"Response body: {response_body}"
    )

@router.post("/register", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """
    Registers a new user inside Supabase Auth and registers profile metadata in public database.
    """
    supabase = get_supabase_client()
    admin_client = get_supabase_admin_client()

    try:
        # 1. Sign up user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User registration failed."
            )

        user_id = auth_response.user.id

        # 2. Write profile to public table in public schema
        profile_data = {
            "id": user_id,
            "name": user_data.name,
            "company": user_data.company,
            "role": "User" # Default role
        }
        
        insert_query = admin_client.table("users").insert(profile_data)
        await asyncio.to_thread(insert_query.execute)

        return ProfileResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            role="User",
            company=user_data.company
        )
    except Exception as e:
        _log_detailed_auth_exception(e, "user registration")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=TokenSchema)
async def login(user_credentials: UserLogin):
    """
    Authenticates user email and password against Supabase, returning JWT access token.
    """
    supabase = get_supabase_client()

    try:
        session_response = supabase.auth.sign_in_with_password({
            "email": user_credentials.email,
            "password": user_credentials.password
        })

        if not session_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed. Invalid password or email."
            )

        return TokenSchema(
            access_token=session_response.session.access_token,
            expires_in=session_response.session.expires_in,
            user_id=session_response.user.id
        )
    except Exception as e:
        _log_detailed_auth_exception(e, "user login")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Returns user details of the currently authenticated token session.
    """
    return ProfileResponse(
        id=current_user.get("id"),
        email=current_user.get("email"),
        name=current_user.get("name"),
        role=current_user.get("role", "User"),
        company=current_user.get("company")
    )

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout():
    """
    Terminates the session and signs the user out of the database workspace.
    """
    # Token invalidation is handled client side by dropping the token, 
    # but we trigger Supabase standard sign-out for audit updates.
    try:
        supabase = get_supabase_client()
        supabase.auth.sign_out()
    except Exception:
        pass # Allow soft logout if network session is already expired
    return {"detail": "Logged out successfully"}
