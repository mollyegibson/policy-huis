from pathlib import Path

from policyhuis_ingest.settings import DotenvFirstSettings
from pydantic import SecretStr
from pydantic_settings import SettingsConfigDict

PROJECT_DIR = Path(__file__).resolve().parents[2]
SOURCES_FILE = PROJECT_DIR / "config" / "sources.yaml"
DBT_PROJECT = PROJECT_DIR / "dbt"
RAW_SCHEMA = "raw_ams_data"


class Settings(DotenvFirstSettings):
    """Settings for the ams-data node's ingestion, read from this project's `.env`."""

    model_config = SettingsConfigDict(env_file=PROJECT_DIR / ".env", extra="ignore")

    ams_data_database_url: SecretStr
    ams_data_reader_password: SecretStr
    neon_s3_endpoint: str
    neon_s3_region: str
    neon_s3_bucket: str
    neon_s3_access_key_id: SecretStr
    neon_s3_secret_access_key: SecretStr
    # RVO's EP-Online API key, needed only to ingest the energielabels source. Optional so the other sources load
    # without it.
    ep_online_api_key: SecretStr | None = None
