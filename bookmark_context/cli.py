import sys


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in ("serve", "mcp"):
        print("Usage: bookmark-context <serve|mcp>")
        sys.exit(1)


if __name__ == "__main__":
    main()
