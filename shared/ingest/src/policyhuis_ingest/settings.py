from pydantic_settings import BaseSettings, PydanticBaseSettingsSource


class DotenvFirstSettings(BaseSettings):
    """Settings where the project's `.env` takes priority over the shell, so other projects' variables can't leak in.

    Subclasses set `model_config = SettingsConfigDict(env_file=...)` to their own `.env`.
    """

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (init_settings, dotenv_settings, env_settings, file_secret_settings)


def sqlalchemy_url(database_url: str) -> str:
    """The database URL with the psycopg 3 driver named, as SQLAlchemy requires."""
    for prefix in ("postgresql://", "postgres://"):
        if database_url.startswith(prefix):
            return "postgresql+psycopg://" + database_url.removeprefix(prefix)
    return database_url
