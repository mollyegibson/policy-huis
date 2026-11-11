from pathlib import Path

from policyhuis_ingest.settings import DotenvFirstSettings
from pydantic import SecretStr
from pydantic_settings import SettingsConfigDict

PROJECT_DIR = Path(__file__).resolve().parents[2]
SOURCES_FILE = PROJECT_DIR / "config" / "sources.yaml"
DBT_PROJECT = PROJECT_DIR / "dbt"
RAW_SCHEMA = "raw_sf_data"


class Settings(DotenvFirstSettings):
    """Settings for the sf-data node's ingestion, read from this project's `.env`."""

    model_config = SettingsConfigDict(env_file=PROJECT_DIR / ".env", extra="ignore")

    sf_data_database_url: SecretStr
    sf_data_reader_password: SecretStr
    neon_s3_endpoint: str
    neon_s3_region: str
    neon_s3_bucket: str
    neon_s3_access_key_id: SecretStr
    neon_s3_secret_access_key: SecretStr
