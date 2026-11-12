"""Embedding text with a model served through OpenRouter by one pinned host, the one path both the passage pipeline
and the docs server use, so stored and query vectors come from the same model and host."""

import math
import re
from collections.abc import Sequence
from typing import Protocol

import httpx

BATCH = 32


class Embedder(Protocol):
    @property
    def model_id(self) -> str:
        """The model and its host, stored with every vector, such as `qwen/qwen3-embedding-4b@deepinfra`."""
        ...

    def embed(self, texts: Sequence[str]) -> list[list[float]]: ...


def checked(model_id: str, vector: Sequence[float | None]) -> list[float]:
    """The vector, refused if it is empty, all zeros, or holds NaN or a non-number."""
    numbers = [x for x in vector if isinstance(x, int | float) and not isinstance(x, bool)]
    if len(numbers) != len(vector) or not any(numbers) or any(math.isnan(x) for x in numbers):
        raise ValueError(f"{model_id} returned an unusable vector")
    return [float(x) for x in numbers]


def same_host(host: str, provider: str) -> bool:
    """Whether OpenRouter's display name for the host that answered (`DeepInfra`) is the pinned host's slug
    (`deepinfra`)."""
    return re.sub(r"[^a-z0-9]", "", provider.lower()) == re.sub(r"[^a-z0-9]", "", host.lower())


class OpenRouterEmbedder:
    """Embeds documents with one model from one host, through OpenRouter's OpenAI-compatible embeddings API. Every
    request pins the host with fallbacks off, and a response from any other host is refused. The host refuses an input
    longer than the model's context rather than cutting it."""

    def __init__(self, client: httpx.Client, api_url: str, api_key: str, model: str, host: str) -> None:
        self._client = client
        self._url = f"{api_url}/embeddings"
        self._headers = {"Authorization": f"Bearer {api_key}"}
        self._model = model
        self._host = host
        self._model_id = f"{model}@{host}"

    @property
    def model_id(self) -> str:
        return self._model_id

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for start in range(0, len(texts), BATCH):
            batch = list(texts[start : start + BATCH])
            body = {
                "model": self._model,
                "input": batch,
                "provider": {"order": [self._host], "allow_fallbacks": False},
            }
            response = self._client.post(self._url, json=body, headers=self._headers)
            response.raise_for_status()
            payload = response.json()
            provider = payload.get("provider")
            if not isinstance(provider, str) or not same_host(self._host, provider):
                raise ValueError(f"{self._model} was served by {provider}, not the configured host {self._host}")
            data = sorted(payload["data"], key=lambda d: d["index"])
            if [d["index"] for d in data] != list(range(len(batch))):
                raise ValueError(f"{self._model_id} returned {len(data)} vectors for {len(batch)} texts")
            vectors += [checked(self._model_id, d["embedding"]) for d in data]
        return vectors
