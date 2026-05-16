from __future__ import annotations
import tomllib
from dataclasses import dataclass, field
from pathlib import Path


DEFAULT_CONFIG_PATH = Path.home() / ".config" / "bookmark-context" / "config.toml"


@dataclass
class Config:
    daemon_port: int = 7331
    embed_model: str = "BAAI/bge-small-en-v1.5"
    db_path: Path = field(default_factory=lambda: Path.home() / ".local" / "share" / "bookmark-context" / "bookmarks.db")
    chroma_path: Path = field(default_factory=lambda: Path.home() / ".local" / "share" / "bookmark-context" / "chroma")


def load_config(config_path: Path = DEFAULT_CONFIG_PATH) -> Config:
    if not config_path.exists():
        return Config()
    with open(config_path, "rb") as f:
        data = tomllib.load(f)
    cfg = Config()
    if "daemon" in data:
        cfg.daemon_port = data["daemon"].get("port", cfg.daemon_port)
    if "embedder" in data:
        cfg.embed_model = data["embedder"].get("model", cfg.embed_model)
    return cfg
