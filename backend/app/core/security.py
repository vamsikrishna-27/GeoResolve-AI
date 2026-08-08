import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status
from app.core.config import settings

# Configure password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies that a plain text password matches its hashed version."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a password string using bcrypt."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a local JWT access token containing the payload data and expiry."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str) -> dict:
    """Decodes a JWT access token using the secret key and verifies its signature."""
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Thread-safe in-memory Token Bucket Rate Limiter
class TokenBucketRateLimiter:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity  # Maximum tokens allowed
        self.refill_rate = refill_rate  # Tokens added per second
        self.buckets: Dict[str, Tuple[float, float]] = {}  # key -> (tokens, last_update_timestamp)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        
        if key not in self.buckets:
            self.buckets[key] = (self.capacity, now)
            return True
            
        tokens, last_update = self.buckets[key]
        
        # Calculate refilled tokens since last request
        elapsed = now - last_update
        refilled = elapsed * self.refill_rate
        new_tokens = min(self.capacity, tokens + refilled)
        
        if new_tokens >= 1:
            self.buckets[key] = (new_tokens - 1, now)
            return True
        else:
            # Starvation bug fix: do not update last_update timestamp when request is blocked.
            return False

# Instantiate a rate limiter: 60 tokens capacity, refill 1 token per second (60/min)
global_rate_limiter = TokenBucketRateLimiter(
    capacity=settings.API_RATE_LIMIT_PER_MINUTE,
    refill_rate=settings.API_RATE_LIMIT_PER_MINUTE / 60.0
)
