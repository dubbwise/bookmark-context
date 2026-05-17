# Bookmark Context

Save bookmarks into named collections, index their content, and search them semantically from Cursor (or any MCP client).

## Components

| Component | What it does |
|-----------|-------------|
| **Daemon** (`bookmark-context serve`) | REST API on `localhost:7331` — stores bookmarks, runs the indexer |
| **Chrome extension** | Side panel UI for managing collections and saving pages |
| **MCP server** (`bookmark-context mcp`) | Exposes `list_collections`, `search_collection`, `ask_collection` to AI clients |

---

## Requirements

- Python 3.11+
- Chrome (or Chromium)
- Node.js 18+ (only needed to rebuild the extension UI)

---

## Setup

### 1. Install the Python package

```bash
python -m venv venv
source venv/bin/activate
pip install -e .
```

### 2. Load the Chrome extension

1. Open `chrome://extensions` and enable **Developer mode**
2. Click **Load unpacked** → select the `extension/dist/` directory
3. Pin the extension; click its icon to open the side panel

> For day-to-day UI work, use `cd extension && npm run dev` (see [Extension development](#extension-development)).
> For a one-off production build: `cd extension && npm install && npm run build`

### 3. Start the daemon

```bash
source venv/bin/activate
bookmark-context serve
```

Runs on `http://localhost:7331` by default. Keep it running while using the extension.

### 4. Configure Cursor (MCP)

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bookmark-context": {
      "command": "bookmark-context",
      "args": ["mcp"]
    }
  }
}
```

Restart Cursor. The MCP server starts on demand when Cursor calls a tool.

---

## Configuration (optional)

Create `~/.config/bookmark-context/config.toml` to override defaults:

```toml
[daemon]
port = 7331

[embedder]
model = "BAAI/bge-small-en-v1.5"
```

Data is stored in `~/.local/share/bookmark-context/`.

---

## Usage

### Saving bookmarks

1. Open the side panel in Chrome
2. Create a collection with **+ New**
3. Navigate to a page and click **Save to collection** — the daemon fetches, indexes, and embeds the page content

### Searching from Cursor

Ask Cursor naturally:

> "Search my *research* collection for React state management patterns"
> "What do my bookmarks say about database indexing?"

Cursor calls `list_collections` to find the right collection, then `search_collection` or `ask_collection` to retrieve relevant chunks.

---

## Development

```bash
# Run Python tests
pip install -e ".[dev]"
pytest

# Run extension tests
cd extension && npm test

# Build extension
cd extension && npm run build
```

### Extension development

From `extension/`:

| Command | What it does |
|---------|----------------|
| `npm run dev` | Rebuilds `dist/` on save (`vite build --watch`) |
| `npm run build` | Production build to `dist/` |

**Recommended for Load unpacked:** `npm run dev`, point Chrome at `extension/dist/`, edit files — after each build finishes, use the header **Reload extension** button (or Reload on `chrome://extensions`) to pick up changes. Re-open the side panel after a reload if it closed.
