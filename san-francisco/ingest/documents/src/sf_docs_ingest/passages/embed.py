"""Embedding text with a model served by Ollama, the one path both the passage pipeline and the docs server use,
so stored and query vectors come from the same model build."""

import math
from collections.abc import Sequence
from typing import Protocol

import httpx

BATCH = 32


class Embedder(Protocol):
    @property
    def model_id(self) -> str:
        """The model and its build, stored with every vector, such as `qwen3-embedding:4b@df5bd2e3c74c`."""
        ...

    def embed(self, texts: Sequence[str]) -> list[list[float]]: ...


def checked(model_id: str, vector: Sequence[float | None]) -> list[float]:
    """The vector, refused if it is empty, all zeros, or holds NaN or a non-number, which Ollama can return with
    HTTP 200."""
    numbers = [x for x in vector if isinstance(x, int | float) and not isinstance(x, bool)]
    if len(numbers) != len(vector) or not any(numbers) or any(math.isnan(x) for x in numbers):
        raise ValueError(f"{model_id} returned an unusable vector")
    return [float(x) for x in numbers]


class OllamaEmbedder:
    """Embeds documents with one pinned model build. Inputs are sent with `truncate: false`, so text longer than
    `num_ctx` tokens fails rather than being cut, and `num_ctx` caps the memory the model holds."""

    def __init__(self, client: httpx.Client, url: str, model: str, build: str, num_ctx: int) -> None:
        response = client.get(f"{url}/api/tags")
        response.raise_for_status()
        digest = next((m["digest"] for m in response.json()["models"] if m["name"] == model), None)
        if digest is None:
            raise ValueError(f"Ollama at {url} has no model {model}; pull it first")
        if digest[: len(build)] != build:
            raise ValueError(f"Ollama at {url} serves {model} build {digest[:12]}, not the configured build {build}")
        self._client = client
        self._url = url
        self._model = model
        self._num_ctx = num_ctx
        self._model_id = f"{model}@{build}"

    @property
    def model_id(self) -> str:
        return self._model_id

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for start in range(0, len(texts), BATCH):
            batch = list(texts[start : start + BATCH])
            body = {"model": self._model, "input": batch, "truncate": False, "options": {"num_ctx": self._num_ctx}}
            response = self._client.post(f"{self._url}/api/embed", json=body)
            response.raise_for_status()
            embeddings = response.json()["embeddings"]
            if len(embeddings) != len(batch):
                raise ValueError(f"{self._model_id} returned {len(embeddings)} vectors for {len(batch)} texts")
            vectors += [checked(self._model_id, v) for v in embeddings]
        return vectors
