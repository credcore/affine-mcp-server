# CredCore local pilot

Follow the [local Claude Code setup guide](docs/claude-code-local.md).

Baseline: upstream `00f116273be3f40364abc651f801d428e6ffc1b2` (3.11.0). Local patches upgrade vulnerable dependencies, adapt record/comment schemas for Zod 4, and add the opt-in workspace guard used by the launcher. The local profile exposes 30 tools and excludes sharing, deletion, trash/restore, account mutation, tool-based sign-in, workspace enumeration, and blobs.

Credentials, server/workspace settings, Node executable selection, and test results belong under the gitignored `.local/` directory. Each employee uses their own AFFiNE session. No employee credentials or internal connection values belong in this public fork.
