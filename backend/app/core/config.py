"""Application configuration loaded from the environment."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for the SplitBill API."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    database_url: str = "postgresql+psycopg://splitbill:splitbill@localhost:5432/splitbill"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    log_level: str = "info"

    @property
    def cors_origin_list(self) -> list[str]:
        """Return the configured origins as a clean list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a process-wide settings instance."""
    return Settings()


settings = get_settings()
