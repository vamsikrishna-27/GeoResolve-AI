from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# 1. Create engine with connection pooling and security pre-pings
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # Discard stale connections automatically
    pool_recycle=3600,       # Recycle connections every hour
    future=True              # Forward-compatible with SQLAlchemy 2.0 syntax
)

# 2. Configure thread-local session maker
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True
)

# 3. Base class for declarative database models
Base = declarative_base()

# 4. FastAPI Dependency Injector yielding database sessions
def get_db():
    """
    Yields a thread-safe database session context and guarantees cleanup on close.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
