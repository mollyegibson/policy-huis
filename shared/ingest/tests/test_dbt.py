from policyhuis_ingest.dbt import dbt_env


def test_dbt_env_splits_a_neon_style_url() -> None:
    env = dbt_env("postgresql://owner:p%40ss@ep-x.neon.tech/neondb?sslmode=require&channel_binding=require")
    assert env == {
        "DBT_HOST": "ep-x.neon.tech",
        "DBT_PORT": "5432",
        "DBT_USER": "owner",
        "DBT_PASSWORD": "p%40ss",
        "DBT_DBNAME": "neondb",
        "DBT_SSLMODE": "require",
    }
