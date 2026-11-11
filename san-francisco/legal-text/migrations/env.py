from alembic import context
from policyhuis_ingest.settings import sqlalchemy_url
from sqlalchemy import create_engine

from sf_legal_text.settings import Settings

config = context.config
settings: Settings = config.attributes.get("settings") or Settings()
url = config.attributes.get("database_url") or settings.sf_legal_text_database_url.get_secret_value()
config.attributes["reader_password"] = settings.sf_legal_text_reader_password.get_secret_value()

engine = create_engine(sqlalchemy_url(url))
with engine.connect() as connection:
    context.configure(connection=connection, version_table_schema="public")
    with context.begin_transaction():
        context.run_migrations()
engine.dispose()
