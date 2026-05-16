from typing import Protocol


class AIAdapter(Protocol):
    def complete(self, system: str, user: str) -> str:
        ...
