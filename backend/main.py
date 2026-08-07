import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.middleware.rate_limit import RateLimitMiddleware

# 1. Routers
from app.api.auth import router as auth_router
from app.api.resolve import router as resolve_router
from app.api.api_keys import router as api_keys_router
from app.api.history import router as history_router
from app.api.analytics import router as analytics_router

# Configure Logger Telemetry
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("GeoResolve-AI-Backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown hooks."""
    logger.info("Initializing GeoResolve AI Core Engine services...")
    yield
    # Shutdown hooks
    logger.info("Shutting down geocoding connections...")
    from app.api.resolve import decision_service
    await decision_service.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise AI-Powered Indian Address Resolution Engine",
    version="1.0.0",
    lifespan=lifespan
)

# 2. CORS MIDDLEWARE
# Required for frontend React dashboards to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. RATE LIMITING MIDDLEWARE
app.add_middleware(RateLimitMiddleware)

# 4. DIAGNOSTICS & TELEMETRY MIDDLEWARE
# Measure response latency times and log API operations
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"API CALL: {request.method} {request.url.path} - Latency: {process_time:.4f}s - Status: {response.status_code}")
    return response

# 5. MOUNT ROUTERS
app.include_router(auth_router)
app.include_router(resolve_router)
app.include_router(api_keys_router)
app.include_router(history_router)
app.include_router(analytics_router)

# 6. HEALTH CHECK DIAGNOSTICS
@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
async def root_health_check():
    """
    Returns baseline server diagnostics health check.
    """
    return {
        "status": "Healthy",
        "service": "GeoResolve AI Geocoder API",
        "version": "1.0.0-stable",
        "environment": "Production-Sandbox"
    }

# 7. GLOBAL EXCEPTION ERROR HANDLER
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"SYSTEM EXCEPTION: {request.method} {request.url.path} - Error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "GeoResolve core engine encountered an unexpected runtime anomaly."}
    )
