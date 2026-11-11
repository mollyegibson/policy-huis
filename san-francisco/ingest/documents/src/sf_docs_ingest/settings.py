from pathlib import Path

from policyhuis_ingest.settings import DotenvFirstSettings
from pydantic import SecretStr
from pydantic_settings import SettingsConfigDict

PROJECT_DIR = Path(__file__).resolve().parents[2]
SOURCES_FILE = PROJECT_DIR / "config" / "sources.yaml"
CORPUS_FILE = PROJECT_DIR / "config" / "corpus.yaml"
SEARCH_FILE = PROJECT_DIR / "config" / "search.yaml"
RAW_SCHEMA = "raw_sf_docs"
CORPUS_SCHEMA = "sf_docs"


class Settings(DotenvFirstSettings):
    """Settings for the sf-docs node's corpus, read from this project's `.env`."""

    model_config = SettingsConfigDict(env_file=PROJECT_DIR / ".env", extra="ignore")

    sf_docs_database_url: SecretStr
    sf_docs_reader_password: SecretStr
    ollama_url: str = "http://localhost:11434"
    neon_s3_endpoint: str | None = None
    neon_s3_region: str | None = None
    neon_s3_bucket: str | None = None
    neon_s3_access_key_id: SecretStr | None = None
    neon_s3_secret_access_key: SecretStr | None = None
