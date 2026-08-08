from pathlib import Path
from typing import List, Union
from urllib.parse import quote_plus

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

# ---------------------------------------------------
# Locate backend/.env
# ---------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    # ---------------------------------------------------
    # Application
    # ---------------------------------------------------

    PROJECT_NAME: str = "GeoResolve AI"
    API_V1_STR: str = "/api/v1"

    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # ---------------------------------------------------
    # MySQL Configuration
    # ---------------------------------------------------

    MYSQL_HOST: str = Field(default="127.0.0.1")
    MYSQL_PORT: int = Field(default=3306)
    MYSQL_DATABASE: str = Field(default="georesolve_ai")
    MYSQL_USER: str = Field(default="root")
    MYSQL_PASSWORD: str = Field(default="")

    # ---------------------------------------------------
    # JWT Configuration
    # ---------------------------------------------------

    SECRET_KEY: str = Field(default="change-this-secret-key")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60)

    # ---------------------------------------------------
    # Logging
    # ---------------------------------------------------

    LOG_LEVEL: str = "INFO"

    # ---------------------------------------------------
    # CORS
    # ---------------------------------------------------

    ALLOWED_ORIGINS: Union[str, List[str]] = "*"

    # ---------------------------------------------------
    # OpenStreetMap
    # ---------------------------------------------------

    NOMINATIM_URL: str = "https://nominatim.openstreetmap.org"
    OVERPASS_URL: str = "https://overpass-api.de/api/interpreter"
    NOMINATIM_USER_AGENT: str = "GeoResolve-AI"

    # ---------------------------------------------------
    # Redis
    # ---------------------------------------------------

    REDIS_URL: str = ""

    # ---------------------------------------------------
    # API Security
    # ---------------------------------------------------

    API_RATE_LIMIT_PER_MINUTE: int = 60

    # ---------------------------------------------------
    # SQLAlchemy Database URL
    # ---------------------------------------------------

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        password = quote_plus(self.MYSQL_PASSWORD)

        return (
            f"mysql+pymysql://"
            f"{self.MYSQL_USER}:{password}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}"
            f"/{self.MYSQL_DATABASE}"
        )

    # ---------------------------------------------------
    # CORS List
    # ---------------------------------------------------

    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.ALLOWED_ORIGINS, str):
            return [
                origin.strip()
                for origin in self.ALLOWED_ORIGINS.split(",")
                if origin.strip()
            ]
        return self.ALLOWED_ORIGINS

    # ---------------------------------------------------
    # Pydantic Settings
    # ---------------------------------------------------

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()