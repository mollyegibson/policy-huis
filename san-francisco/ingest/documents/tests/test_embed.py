import json

import httpx
import pytest

from sf_docs_ingest.passages.embed import OpenRouterEmbedder, same_host


def client(
    embeddings: list[list[float | None]],
    seen: list[httpx.Request] | None = None,
    provider: str = "DeepInfra",
    reverse: bool = False,
) -> httpx.Client:
    def handle(request: httpx.Request) -> httpx.Response:
        if seen is not None:
            seen.append(request)
        body = json.loads(request.content)
        vectors = embeddings[: len(body["input"])]
        data = [{"object": "embedding", "index": i, "embedding": v} for i, v in enumerate(vectors)]
        payload = {"object": "list", "provider": provider, "data": data[::-1] if reverse else data}
        return httpx.Response(200, content=json.dumps(payload).encode(), headers={"content-type": "application/json"})

    return httpx.Client(transport=httpx.MockTransport(handle))


def embedder(c: httpx.Client) -> OpenRouterEmbedder:
    return OpenRouterEmbedder(c, "https://router.test/api/v1", "test-key", "qwen/qwen3-embedding-4b", "deepinfra")


def test_requests_pin_the_host_without_fallbacks() -> None:
    seen: list[httpx.Request] = []
    e = embedder(client([[0.5, 0.5]], seen))
    assert e.embed(["a"]) == [[0.5, 0.5]]
    assert e.model_id == "qwen/qwen3-embedding-4b@deepinfra"
    assert str(seen[0].url) == "https://router.test/api/v1/embeddings"
    assert seen[0].headers["authorization"] == "Bearer test-key"
    assert json.loads(seen[0].content) == {
        "model": "qwen/qwen3-embedding-4b",
        "input": ["a"],
        "provider": {"order": ["deepinfra"], "allow_fallbacks": False},
    }


def test_vectors_follow_the_input_order() -> None:
    assert embedder(client([[1.0], [2.0]], reverse=True)).embed(["a", "b"]) == [[1.0], [2.0]]


def test_another_host_is_refused() -> None:
    with pytest.raises(ValueError, match="not the configured host deepinfra"):
        embedder(client([[1.0]], provider="Nebius")).embed(["a"])


@pytest.mark.parametrize(("host", "provider"), [("deepinfra", "DeepInfra"), ("google-vertex", "Google Vertex")])
def test_a_host_slug_matches_its_display_name(host: str, provider: str) -> None:
    assert same_host(host, provider)


@pytest.mark.parametrize("vector", [[], [0.0, 0.0], [float("nan"), 1.0], [None, 1.0]])
def test_an_empty_all_zero_nan_or_null_vector_is_refused(vector: list[float | None]) -> None:
    with pytest.raises(ValueError, match="unusable vector"):
        embedder(client([vector])).embed(["a"])


def test_too_few_vectors_are_refused() -> None:
    with pytest.raises(ValueError, match="1 vectors for 2 texts"):
        embedder(client([[1.0]])).embed(["a", "b"])


def test_an_error_status_is_raised() -> None:
    def handle(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"error": {"message": "input too long"}})

    with pytest.raises(httpx.HTTPStatusError):
        embedder(httpx.Client(transport=httpx.MockTransport(handle))).embed(["a"])
