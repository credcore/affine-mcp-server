#!/bin/sh
set -eu
MCP_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec /bin/sh "$MCP_ROOT/local-mcp.sh" login --cookie-stdin "$@"
