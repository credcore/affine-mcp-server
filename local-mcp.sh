#!/bin/sh
set -eu
MCP_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -f "$MCP_ROOT/.local/node-path" ]; then
  IFS= read -r MCP_NODE < "$MCP_ROOT/.local/node-path"
else
  MCP_NODE=$(node -p 'process.execPath')
fi
if [ ! -x "$MCP_NODE" ] || [ ! -f "$MCP_ROOT/dist/index.js" ]; then
  echo 'Run local-install.sh before starting this MCP server.' >&2
  exit 1
fi
umask 077
mkdir -p "$MCP_ROOT/.local/config"
exec env -i HOME="$HOME" PATH=/usr/bin:/bin \
  XDG_CONFIG_HOME="$MCP_ROOT/.local/config" \
  MCP_TRANSPORT=stdio \
  AFFINE_CLIENT_VERSION=0.27.4 AFFINE_WS_CLIENT_VERSION=0.27.4 \
  AFFINE_TOOL_PROFILE=core \
  AFFINE_DISABLED_GROUPS=auth,admin,blobs,cleanup,destructive,docs.share,experimental,notifications,workspaces.write \
  AFFINE_DISABLED_TOOLS=trash_doc,restore_doc,list_workspaces \
  AFFINE_LOCAL_ENFORCE_DEFAULT_WORKSPACE=true \
  "$MCP_NODE" "$MCP_ROOT/dist/index.js" "$@"
