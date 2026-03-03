# agents.md

## Project
clock.orchestrio.li time-tracking tool.

## Requirements
- Keep code readable and maintainable.
- Backend: Node.js + SQLite API.
- Frontend: simple no-build UI.
- Deploy via Docker + Traefik on `clock.orchestrio.li`.

## Guardrails
- No destructive DB migrations without backup.
- Keep API surface minimal and explicit.
