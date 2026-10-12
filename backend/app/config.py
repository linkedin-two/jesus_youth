import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = "KCYM VITAMIN C PAROPPADY registration API"
    PROJECT_VERSION: str = "1.0.0"
    
    # MongoDB connection URL (Pass your MongoDB Atlas or local URI here)
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME") or os.getenv("DATABASE_NAME") or "jesus_youth"
    
    # CORS Origins (allow frontend dev server and production origins)
    _cors_env: str = os.getenv("CORS_ORIGINS", "")
    CORS_ORIGINS: list[str] = (
        [origin.strip() for origin in _cors_env.split(",") if origin.strip()]
        if _cors_env
        else [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "*"
        ]
    )

    # Admin Security & Auth Key
    ADMIN_KEY: str = os.getenv("ADMIN_KEY", "vitaminc_secret_2026")
    ADMIN_USER: str = os.getenv("ADMIN_USER", "admin")
    ADMIN_PASS: str = os.getenv("ADMIN_PASS", "vitaminc")

settings = Settings()
