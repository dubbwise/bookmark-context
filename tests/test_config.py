import tomllib
from pathlib import Path
from bookmark_context.config import Config, load_config


def test_load_config_defaults(tmp_path: Path):
    config = load_config(config_path=tmp_path / "config.toml")
    assert config.daemon_port == 7331
    assert config.ai_backend == "claude"
    assert config.claude_chat_model == "claude-sonnet-4-6"
    assert config.ollama_base_url == "http://localhost:11434"
    assert config.ollama_chat_model == "llama3"
    assert config.embed_model == "BAAI/bge-small-en-v1.5"


def test_load_config_from_toml(tmp_path: Path):
    toml_content = """
[ai]
backend = "ollama"

[ollama]
chat_model = "mistral"
"""
    config_file = tmp_path / "config.toml"
    config_file.write_text(toml_content)
    config = load_config(config_path=config_file)
    assert config.ai_backend == "ollama"
    assert config.ollama_chat_model == "mistral"
    assert config.daemon_port == 7331  # default preserved
