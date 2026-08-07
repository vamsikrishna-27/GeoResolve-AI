import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Get the absolute path to the backend directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "GeoResolve AI"
    API_V1_STR: str = "/api/v1"
    
    # Supabase Configuration
    SUPABASE_URL: str = Field(default="https://your-supabase-project.supabase.co")
    SUPABASE_KEY: str = Field(default="your-supabase-anon-key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="your-supabase-service-key")
    SUPABASE_JWT_SECRET: str = Field(default="your-supabase-jwt-secret")
    
    # OpenStreetMap Configuration
    NOMINATIM_URL: str = "https://nominatim.openstreetmap.org"
    OVERPASS_URL: str = "https://overpass-api.de/api/interpreter"
    NOMINATIM_USER_AGENT: str = "GeoResolve-AI-SaaS-Enterprise-Engine"
    
    # Redis Cache Configuration (Optional fallback to memory)
    REDIS_URL: str = ""
    
    # Security Configuration
    API_RATE_LIMIT_PER_MINUTE: int = 60
    
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
