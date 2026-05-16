import pytest
import respx
import httpx
from unittest.mock import MagicMock, patch
from bookmark_context.ai.claude import ClaudeAdapter
from bookmark_context.ai.ollama import OllamaAdapter


def test_claude_adapter_complete():
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="Paris")]
    mock_client.messages.create.return_value = mock_response

    with patch("bookmark_context.ai.claude.anthropic.Anthropic", return_value=mock_client):
        adapter = ClaudeAdapter(api_key="sk-test", model="claude-sonnet-4-6")
        result = adapter.complete(system="You are helpful.", user="What is the capital of France?")

    assert result == "Paris"
    mock_client.messages.create.assert_called_once()
    call_kwargs = mock_client.messages.create.call_args.kwargs
    assert call_kwargs["model"] == "claude-sonnet-4-6"
    assert call_kwargs["system"] == "You are helpful."


@respx.mock
def test_ollama_adapter_complete():
    respx.post("http://localhost:11434/api/chat").mock(
        return_value=httpx.Response(200, json={
            "message": {"content": "The answer is 42."}
        })
    )
    adapter = OllamaAdapter(base_url="http://localhost:11434", model="llama3")
    result = adapter.complete(system="You are helpful.", user="What is the answer?")
    assert result == "The answer is 42."
