import logging
import traceback

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import User
from app.dependencies.auth import get_current_user
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
)
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenSchema,
    ProfileResponse,
    ProfileUpdate,
)
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("GeoResolve-AI-Backend")


@router.post(
    "/register",
    response_model=ProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    user_data: UserRegister,
    db: Session = Depends(get_db),
):
    """
    Registers a new user inside the local MySQL database and hashes their password.
    """

    try:
        # Check if email already exists
        existing_user = (
            db.query(User)
            .filter(User.email == user_data.email)
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists.",
            )

        # ==========================
        # DEBUG OUTPUT
        # ==========================
        print("=" * 60)
        print("Email      :", repr(user_data.email))
        print("Password   :", repr(user_data.password))
        print("Length     :", len(user_data.password))
        print("Byte Length:", len(user_data.password.encode("utf-8")))
        print("Name       :", repr(user_data.name))
        print("Company    :", repr(user_data.company))
        print("=" * 60)

        # Hash password
        hashed_password = get_password_hash(user_data.password)

        print("Password hashed successfully!")

        # Create user
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            name=user_data.name,
            company=user_data.company,
            role="User",
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return ProfileResponse(
            id=str(new_user.id),
            email=new_user.email,
            name=new_user.name,
            role=new_user.role,
            company=new_user.company,
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}",
        )


@router.post("/login", response_model=TokenSchema)
async def login(
    user_credentials: UserLogin,
    db: Session =Depends(get_db),
):
    """
    Authenticate user and return JWT token.
    """

    try:
        user = (
            db.query(User)
            .filter(User.email == user_credentials.email)
            .first()
        )

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not verify_password(
            user_credentials.password,
            user.password_hash,
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
                "role": user.role,
            }
        )

        return TokenSchema(
            access_token=access_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=str(user.id),
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}",
        )


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    current_user: dict = Depends(get_current_user),
):
    """
    Returns currently authenticated user's profile.
    """

    return ProfileResponse(
        id=current_user.get("id"),
        email=current_user.get("email"),
        name=current_user.get("name"),
        role=current_user.get("role", "User"),
        company=current_user.get("company"),
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
)
async def logout():
    """
    Stateless logout.
    """

    return {
        "detail": "Logged out successfully"
    }


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the authenticated user's name and organization/company in MySQL.
    """
    import uuid
    try:
        user_uuid = uuid.UUID(current_user["id"])
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format."
        )

    db_user = db.query(User).filter(User.id == user_uuid).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found."
        )

    db_user.name = profile_data.full_name
    db_user.company = profile_data.organization
    db.commit()
    db.refresh(db_user)

    return ProfileResponse(
        id=str(db_user.id),
        email=db_user.email,
        name=db_user.name,
        role=db_user.role,
        company=db_user.company,
    )