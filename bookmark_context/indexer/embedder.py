from __future__ import annotations
from fastembed import TextEmbedding


class Embedder:
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5") -> None:
        self._model = TextEmbedding(model_name=model_name)

    def embed(self, texts: list[str]) -> list[list[float]]:
        result = []
        for v in self._model.embed(texts):
            if hasattr(v, 'tolist'):
                result.append(v.tolist())
            else:
                result.append(v)
        return result
