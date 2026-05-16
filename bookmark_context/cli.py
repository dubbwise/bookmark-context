from __future__ import annotations
import sys


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in ("serve", "mcp"):
        print("Usage: bookmark-context <serve|mcp>")
        sys.exit(1)

    command = sys.argv[1]

    if command == "serve":
        import uvicorn
        from bookmark_context.config import load_config
        from bookmark_context.api.app import create_app
        config = load_config()
        app = create_app(config)
        uvicorn.run(app, host="127.0.0.1", port=config.daemon_port)

    elif command == "mcp":
        from bookmark_context.mcp.server import run_mcp_server
        run_mcp_server()


if __name__ == "__main__":
    main()
