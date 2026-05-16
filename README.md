###Load the extension:
1. Open chrome://extensions, enable Developer mode
2. Click "Load unpacked" → select extension/ directory

###Start the daemon:
pip install -e .
bookmark-context serve

###Manual verification checklist (from the plan):
- Status bar shows "Online · claude"
- Create collections via "+ New" dialog
- Add pages via side panel dropdown or right-click context menu
- Click a collection → see bookmarks with status badges updating from Pending → Indexed
- Options page (⚙) lets you change the daemon port

###Cursor MCP integration:
Add to ~/.cursor/mcp.json:
{
  "mcpServers": {
    "bookmark-context": {
      "command": "bookmark-context",
      "args": ["mcp"]
    }
  }
}