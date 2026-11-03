# Local setup for Claude Code

Requires macOS or Linux, Node.js 24+, npm, Git, Claude Code, and access to your self-hosted AFFiNE server. On Windows, run these steps in WSL.

## Install

```sh
mkdir -p "$HOME/Tools"
git clone --branch credcore-pilot-2026-11-03 --single-branch \
  https://github.com/credcore/affine-mcp-server.git \
  "$HOME/Tools/affine-mcp-server"
cd "$HOME/Tools/affine-mcp-server"
sh ./local-install.sh
```

The installer uses locked dependencies with lifecycle scripts disabled and builds locally. It records the Node executable under `.local/`; rerun it if your Node installation changes.

## Sign in to AFFiNE

For browser-based SSO, sign into your AFFiNE server in Chrome. Open DevTools → Network, reload, and select an authenticated request such as `graphql`. Copy the **Cookie** value from **Request Headers**.

Run the following with your server URL. Optionally add `--workspace-id YOUR-WORKSPACE-ID`; otherwise select a workspace interactively.

```sh
cd "$HOME/Tools/affine-mcp-server"
sh ./local-login.sh --url 'https://YOUR-AFFINE-HOST'
```

Paste the cookie at the hidden terminal prompt. Use your own session. Do not paste it into chat or commit it. The helper verifies the connection and stores the session under `.local/config/affine-mcp/config` with owner-only permissions. Clear the copied cookie from your clipboard afterward.

When the session expires, repeat this step with a fresh cookie and reconnect the MCP server.

## Add to Claude Code

```sh
claude mcp add --transport stdio --scope user affine -- \
  /bin/sh "$HOME/Tools/affine-mcp-server/local-mcp.sh"
```

Start a fresh Claude Code session and run `/mcp`. Confirm `affine` is connected and exposes 30 tools. Use `--scope local` from a project directory instead of `--scope user` to register it only for that project. [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)

## Permissions

Merge [claude-code-permissions.json](claude-code-permissions.json) into your project's `.claude/settings.local.json`, preserving any existing settings. It allows the 15 read tools and requests approval for the 15 write tools. Check the effective settings with `/permissions` and use a mode that honors manual approval. [Claude Code permissions](https://code.claude.com/docs/en/permissions)

The launcher uses local stdio, isolates its saved login, and restricts calls to the workspace selected at login. Publication, deletion, account changes, workspace enumeration, and blob operations are disabled. Document reads still send content to Claude; apply your organization's data policy.

## Verify

```sh
cd "$HOME/Tools/affine-mcp-server"
node local-smoke.mjs
```

For an optional live check:

```sh
node local-smoke.mjs --live
```

The live check creates and edits one new disposable document and leaves it for inspection. It does not edit existing documents. Results are saved under `.local/results/`. Do not run upstream destructive integration tests against a shared workspace.

## Troubleshooting

- Check network/VPN access and that AFFiNE opens in your browser.
- Run `claude mcp get affine` and check `/mcp` for connection status.
- For expired sessions, repeat login and reconnect.
- For workspace errors, check your account's access and the workspace selected during login.
- Remove the registration with `claude mcp remove affine --scope user`, using the scope chosen during setup. Removing the registration does not revoke the AFFiNE session.
