import tomllib
from pathlib import Path
from bookmark_context.config import Config, load_config


def test_load_config_defaults(tmp_path: Path):
    config = load_config(config_path=tmp_path / "config.toml")
    assert config.daemon_port == 7331
    assert config.embed_model == "BAAI/bge-small-en-v1.5"


def test_load_config_from_toml(tmp_path: Path):
    toml_content = """
[daemon]
port = 7332

[embedder]
model = "BAAI/bge-large-en-v1.5"
"""
    config_file = tmp_path / "config.toml"
    config_file.write_text(toml_content)
    config = load_config(config_path=config_file)
    assert config.daemon_port == 7332
    assert config.embed_model == "BAAI/bge-large-en-v1.5"
