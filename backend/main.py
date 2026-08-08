import time
import logging
import traceback
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
    
    # Automatically create database if it does not exist in MySQL
    try:
        import pymysql
        conn = pymysql.connect(
            host=settings.MYSQL_HOST,
            port=settings.MYSQL_PORT,
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.MYSQL_DATABASE}")
        conn.close()
        logger.info(f"MySQL database '{settings.MYSQL_DATABASE}' verified/created.")
    except Exception as e:
        logger.warning(f"Could not verify/create database '{settings.MYSQL_DATABASE}' pre-startup: {e}")

    # Automatically create database tables if they do not exist in MySQL
    logger.info("Verifying MySQL database tables existence...")
    try:
        from app.database.session import engine
        from app.database.models import Base
        Base.metadata.create_all(bind=engine)
        logger.info("MySQL database tables verified and loaded successfully.")

        # Seed demo user for instant login tests
        from app.database.session import SessionLocal
        from app.database.models import User
        from app.core.security import get_password_hash
        db_session = SessionLocal()
        try:
            demo_user = db_session.query(User).filter(User.email == "demo@georesolve.ai").first()
            if not demo_user:
                logger.info("Seeding demo user in MySQL database...")
                demo = User(
                    email="demo@georesolve.ai",
                    password_hash=get_password_hash("password123"),
                    name="Jane Doe",
                    company="Vercel Partner Corp",
                    role="User"
                )
                db_session.add(demo)
                db_session.commit()
                logger.info("Demo user seeded successfully.")
        finally:
            db_session.close()

    except Exception as e:
        logger.error(f"Failed to auto-create or seed database: {traceback.format_exc()}")

    yield
    
    # Shutdown hooks
    logger.info("Shutting down geocoding connections...")
    try:
        from app.api.resolve import decision_service
        await decision_service.close()
    except Exception as e:
        logger.error(f"Error during decision service shutdown: {e}")
    logger.info("Server connections terminated successfully.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise AI-Powered Indian Address Resolution Engine",
    version="1.0.0",
    lifespan=lifespan
)

# 2. CORS MIDDLEWARE
# Allow frontend web portal to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. RATE LIMITING MIDDLEWARE
app.add_middleware(RateLimitMiddleware)

# 4. DIAGNOSTICS & TELEMETRY MIDDLEWARE
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
    logger.error(f"SYSTEM EXCEPTION: {request.method} {request.url.path} - Error: {traceback.format_exc()}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "GeoResolve core engine encountered an unexpected runtime anomaly."}
    )
