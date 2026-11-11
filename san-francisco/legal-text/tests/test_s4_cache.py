from pathlib import Path

from spikes.s4.cache import EmbeddingCache


def test_cache_computes_only_new_text_and_survives_reopening(tmp_path: Path) -> None:
    calls: list[list[str]] = []

    def compute(texts: list[str]) -> list[list[float]]:
        calls.append(texts)
        return [[float(len(t))] for t in texts]

    first, computed = EmbeddingCache(tmp_path, "voyage/m").embed(["a", "bb", "a"], "document", compute)
    assert (first, computed) == ([[1.0], [2.0], [1.0]], 2)

    reopened = EmbeddingCache(tmp_path, "voyage/m")
    vectors, computed = reopened.embed(["bb", "ccc"], "document", compute)
    assert (vectors, computed) == ([[2.0], [3.0]], 1)
    assert calls == [["a", "bb"], ["ccc"]]


def test_cache_separates_input_types_and_namespaces(tmp_path: Path) -> None:
    def compute(texts: list[str]) -> list[list[float]]:
        return [[1.0] for _ in texts]

    EmbeddingCache(tmp_path, "voyage/m").embed(["a"], "document", compute)
    assert EmbeddingCache(tmp_path, "voyage/m").embed(["a"], "query", compute)[1] == 1
    assert EmbeddingCache(tmp_path, "voyage/other").embed(["a"], "document", compute)[1] == 1
