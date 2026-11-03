#!/bin/sh
set -eu
MCP_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$MCP_ROOT"
node -e 'if (Number(process.versions.node.split(".")[0]) < 24) { console.error("Use Node.js 24 or newer for this local pilot."); process.exit(1); }'
umask 077
mkdir -p .local
node -p 'process.execPath' > .local/node-path
npm ci --ignore-scripts --no-fund
npm run build
echo 'Build ready. Run local-login.sh --url <your-affine-url> to save your own session.'
