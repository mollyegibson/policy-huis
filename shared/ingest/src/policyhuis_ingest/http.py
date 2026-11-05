import httpx


class HttpFetcher:
    def __init__(self) -> None:
        self._client = httpx.Client(timeout=120.0, follow_redirects=True)

    def get(self, url: str) -> bytes:
        response = self._client.get(url)
        response.raise_for_status()
        return response.content
