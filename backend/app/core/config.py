from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_ENV: str = "local"
    DATABASE_URL: str
    REDIS_URL: str

    JWT_SECRET: str = "dev_secret"
    JWT_ALG: str = "HS256"
    JWT_ACCESS_TTL_MIN: int = 120

    CORS_ORIGINS: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
