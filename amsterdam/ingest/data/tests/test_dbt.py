from pathlib import Path

from policyhuis_ingest.dbt import run_dbt

from ams_data_ingest.settings import DBT_PROJECT


def test_dbt_build_succeeds_with_the_confirmed_models(migrated_url: str) -> None:
    assert run_dbt(Path(DBT_PROJECT), migrated_url, ["build"]) == 0
