"""Spike S4's on-disk embedding cache, so a rerun embeds only text it has not embedded before."""

import hashlib
import json
import re
from collections.abc import Callable
from pathlib import Path

CHUNK = 32


class EmbeddingCache:
    """Vectors for one model, kept in a JSON Lines file named after `namespace`. A vector is keyed by the SHA-256 of
    the namespace, the input type and the exact text, so the namespace must name everything else that determines a
    vector: provider, model and its build, and request options."""

    def __init__(self, directory: Path, namespace: str) -> None:
        self.namespace = namespace
        directory.mkdir(parents=True, exist_ok=True)
        self.path = directory / (re.sub(r"[^A-Za-z0-9.=-]+", "_", namespace) + ".jsonl")
        self.vectors: dict[str, list[float]] = {}
        if self.path.exists():
            for line in self.path.read_text().splitlines():
                entry = json.loads(line)
                self.vectors[entry["key"]] = entry["vector"]

    def key(self, input_type: str, text: str) -> str:
        return hashlib.sha256(json.dumps([self.namespace, input_type, text]).encode()).hexdigest()

    def embed(
        self, texts: list[str], input_type: str, compute: Callable[[list[str]], list[list[float]]]
    ) -> tuple[list[list[float]], int]:
        """The vectors for `texts`, computing the ones not yet cached in chunks and saving each chunk as it
        arrives, so an interrupted run keeps what it paid for. Also returns how many texts were computed."""
        missing = list(dict.fromkeys(t for t in texts if self.key(input_type, t) not in self.vectors))
        for start in range(0, len(missing), CHUNK):
            chunk = missing[start : start + CHUNK]
            vectors = compute(chunk)
            if len(vectors) != len(chunk):
                raise ValueError(f"{self.namespace} returned {len(vectors)} vectors for {len(chunk)} texts")
            with self.path.open("a") as file:
                for text, vector in zip(chunk, vectors, strict=True):
                    key = self.key(input_type, text)
                    self.vectors[key] = vector
                    file.write(json.dumps({"key": key, "vector": vector}) + "\n")
        return [self.vectors[self.key(input_type, t)] for t in texts], len(missing)
