import hashlib
from pathlib import Path
from typing import Protocol

import boto3
from botocore.config import Config
from pydantic import SecretStr


class Archive(Protocol):
    def put(self, key: str, data: bytes) -> None: ...


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class S3Archive:
    """S3-compatible object storage (Neon's), configured only from explicit settings, never ambient AWS config."""

    def __init__(
        self, endpoint: str, region: str, bucket: str, access_key_id: SecretStr, secret_access_key: SecretStr
    ) -> None:
        self._bucket = bucket
        self._client = boto3.session.Session(
            aws_access_key_id=access_key_id.get_secret_value(),
            aws_secret_access_key=secret_access_key.get_secret_value(),
            region_name=region,
            profile_name=None,
        ).client("s3", endpoint_url=endpoint, config=Config(signature_version="s3v4"))

    def put(self, key: str, data: bytes) -> None:
        self._client.put_object(Bucket=self._bucket, Key=key, Body=data)


class LocalArchive:
    """An archive in a local directory, for tests."""

    def __init__(self, root: Path) -> None:
        self._root = root

    def put(self, key: str, data: bytes) -> None:
        path = self._root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
