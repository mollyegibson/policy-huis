"""Test doubles for code that fetches sources."""


class FakeFetcher:
    """Serves fixed responses by URL prefix, and fails on any URL it has no response for."""

    def __init__(self, responses: dict[str, bytes]) -> None:
        self._responses = responses
        self.requested: list[str] = []

    def get(self, url: str) -> bytes:
        self.requested.append(url)
        for prefix, body in self._responses.items():
            if url.startswith(prefix):
                return body
        raise AssertionError(f"unexpected request: {url}")
