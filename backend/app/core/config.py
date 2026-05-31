from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    PROJECT_NAME: str = "IOCenrich"
    
    # DB Configuration — override in .env for production
    POSTGRES_USER: str = "ioc_admin"
    POSTGRES_PASSWORD: str = "ioc_dev_password"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "ioc_platform"

    @property
    def sync_database_url(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}?sslmode=prefer"
    
    @property
    def async_database_url(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # API Key Vault (AES-256-GCM envelope encryption)
    # IMPORTANT: Generate your own key with: python -c "import secrets; print(secrets.token_hex(32))"
    # Never use the default key in production.
    VAULT_MASTER_KEY: str = "00000000000000000000000000000000000000000000000000000000000000dev"
    VAULT_SALT: str = "ioc_dev_salt_v1!"

settings = Settings()
