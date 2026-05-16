from __future__ import annotations
import httpx


class OllamaAdapter:
    def __init__(self, base_url: str, model: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model

    def complete(self, system: str, user: str) -> str:
        response = httpx.post(
            f"{self._base_url}/api/chat",
            json={
                "model": self._model,
                "stream": False,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
            timeout=60,
        )
        response.raise_for_status()
        return response.json()["message"]["content"]
