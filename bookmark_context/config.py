from __future__ import annotations
import tomllib
from dataclasses import dataclass, field
from pathlib import Path


DEFAULT_CONFIG_PATH = Path.home() / ".config" / "bookmark-context" / "config.toml"


@dataclass
class Config:
    daemon_port: int = 7331
    ai_backend: str = "claude"
    claude_api_key: str = ""
    claude_chat_model: str = "claude-sonnet-4-6"
    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "llama3"
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
    if "ai" in data:
        cfg.ai_backend = data["ai"].get("backend", cfg.ai_backend)
    if "claude" in data:
        cfg.claude_api_key = data["claude"].get("api_key", cfg.claude_api_key)
        cfg.claude_chat_model = data["claude"].get("chat_model", cfg.claude_chat_model)
    if "ollama" in data:
        cfg.ollama_base_url = data["ollama"].get("base_url", cfg.ollama_base_url)
        cfg.ollama_chat_model = data["ollama"].get("chat_model", cfg.ollama_chat_model)
    if "embedder" in data:
        cfg.embed_model = data["embedder"].get("model", cfg.embed_model)
    return cfg
