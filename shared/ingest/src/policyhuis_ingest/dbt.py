import os
import subprocess
from pathlib import Path
from urllib.parse import parse_qs, urlparse


def dbt_env(database_url: str) -> dict[str, str]:
    """Connection settings for a dbt profile, split out of the database URL into `DBT_*` variables."""
    parts = urlparse(database_url)
    query = parse_qs(parts.query)
    return {
        "DBT_HOST": parts.hostname or "",
        "DBT_PORT": str(parts.port or 5432),
        "DBT_USER": parts.username or "",
        "DBT_PASSWORD": parts.password or "",
        "DBT_DBNAME": parts.path.lstrip("/"),
        "DBT_SSLMODE": query.get("sslmode", ["prefer"])[0],
    }


def run_dbt(project_dir: Path, database_url: str, args: list[str]) -> int:
    """Run dbt in a project whose `profiles.yml` reads the `DBT_*` variables, installing its packages first."""
    env = {**os.environ, **dbt_env(database_url)}
    location = ["--project-dir", str(project_dir), "--profiles-dir", str(project_dir)]
    deps = subprocess.run(["dbt", "deps", *location], env=env, check=False)
    if deps.returncode != 0:
        return deps.returncode
    return subprocess.run(["dbt", *args, *location], env=env, check=False).returncode
