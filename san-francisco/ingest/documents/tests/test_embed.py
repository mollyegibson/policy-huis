import json

import httpx
import pytest

from sf_docs_ingest.passages.embed import OllamaEmbedder

TAGS = {"models": [{"name": "qwen3-embedding:4b", "digest": "df5bd2e3c74c" + "0" * 52}]}


def client(embeddings: list[list[float | None]], seen: list[dict[str, object]] | None = None) -> httpx.Client:
    def handle(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json=TAGS)
        body = json.loads(request.content)
        if seen is not None:
            seen.append(body)
        payload = json.dumps({"embeddings": embeddings[: len(body["input"])]})
        return httpx.Response(200, content=payload.encode(), headers={"content-type": "application/json"})

    return httpx.Client(transport=httpx.MockTransport(handle), base_url="http://ollama")


def embedder(c: httpx.Client, build: str = "df5bd2e3c74c") -> OllamaEmbedder:
    return OllamaEmbedder(c, "http://ollama", "qwen3-embedding:4b", build, 4096)


def test_requests_never_truncate_and_cap_the_context() -> None:
    seen: list[dict[str, object]] = []
    e = embedder(client([[0.5, 0.5]], seen))
    assert e.embed(["a"]) == [[0.5, 0.5]]
    assert e.model_id == "qwen3-embedding:4b@df5bd2e3c74c"
    assert seen == [{"model": "qwen3-embedding:4b", "input": ["a"], "truncate": False, "options": {"num_ctx": 4096}}]


def test_another_build_of_the_model_is_refused() -> None:
    with pytest.raises(ValueError, match="not the configured build"):
        embedder(client([]), build="ac6da0dfba84")


@pytest.mark.parametrize("vector", [[], [0.0, 0.0], [float("nan"), 1.0], [None, 1.0]])
def test_an_empty_all_zero_nan_or_null_vector_is_refused(vector: list[float | None]) -> None:
    with pytest.raises(ValueError, match="unusable vector"):
        embedder(client([vector])).embed(["a"])


def test_too_few_vectors_are_refused() -> None:
    with pytest.raises(ValueError, match="1 vectors for 2 texts"):
        embedder(client([[1.0]])).embed(["a", "b"])
