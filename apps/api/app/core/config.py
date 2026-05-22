from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    database_url: str = "sqlite:///./valida_ifc.sqlite3"
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    upload_max_bytes: int = 100 * 1024 * 1024
    upload_max_files_per_project: int = 100
    upload_max_files_per_user_per_project: int = 30
    local_storage_path: str = "./storage"
    storage_retention_days: int = 90
    redis_url: str = "redis://localhost:6379/0"
    audit_queue_name: str = "ifc_audits"
    viewer_geometry_max_elements: int = 300
    viewer_geometry_max_triangles_per_element: int = 30000
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
