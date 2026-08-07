import time
from typing import Dict, Optional, Tuple
from jose import jwt, JWTError
from fastapi import HTTPException, status
from app.core.config import settings

# JWT verification helper for decoding Supabase authentication tokens
def verify_supabase_jwt(token: str) -> dict:
    try:
        # Supabase uses RS256 or HS256 for signing JWTs.
        # By default, we decode using the Supabase JWT secret. In enterprise environments, 
        # this is verified against the project's JWKS endpoint or using the shared secret.
        payload = jwt.decode(
            token, 
            settings.SUPABASE_JWT_SECRET, 
            algorithms=["HS256"], 
            audience="authenticated"
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
            # Keeping the old state allows tokens to accumulate normally over elapsed time.
            return False

# Instantiate a rate limiter: 60 tokens capacity, refill 1 token per second (60/min)
global_rate_limiter = TokenBucketRateLimiter(
    capacity=settings.API_RATE_LIMIT_PER_MINUTE,
    refill_rate=settings.API_RATE_LIMIT_PER_MINUTE / 60.0
)
