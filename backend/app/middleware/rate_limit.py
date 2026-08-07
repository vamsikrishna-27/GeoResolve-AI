from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.security import global_rate_limiter

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Identify the client by IP or API Key (if provided in header)
        client_key = request.headers.get("X-API-KEY")
        if not client_key:
            # Fallback to host IP
            client_key = request.client.host if request.client else "unknown"

        # Bypass rate limits for specific documentation paths
        if request.url.path in ["/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        # Check rate limiter
        if not global_rate_limiter.is_allowed(client_key):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please slow down and respect the rate limit guidelines."}
            )

        return await call_next(request)
