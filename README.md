###Load the extension:
1. Open chrome://extensions, enable Developer mode
2. Click "Load unpacked" → select extension/ directory

###Start the daemon:
-- fix shortcut

pip install -e .
bookmark-context serve

###Cursor MCP integration:
-- fix shortcut

Add to ~/.cursor/mcp.json:
{
  "mcpServers": {
    "bookmark-context": {
      "command": "bookmark-context",
      "args": ["mcp"]
    }
  }
}