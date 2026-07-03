from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    app_name: str = "PMER Dataset Collector"
    debug: bool = True
    collection_target: int = 1500

    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 43200  # 30 days

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "pmer_dataset"

    # CORS
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # Admins (comma-separated emails) allowed to add YouTube links.
    # Configure the real value in .env (gitignored) - never hardcode it here.
    admin_emails: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False

    def get_allowed_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    def get_admin_emails(self) -> List[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]


settings = Settings()
