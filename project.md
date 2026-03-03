# project.md — Clock Orchestrio Requirements (v1)

Consolidated from `project.v1.md`.

## Scope
Build a web-based time-tracking tool for `clock.orchestrio.li` with a frontend and backend.

## Functional requirements
1. The system must allow starting a live timer with a required task name.
2. The system must allow stopping the currently active timer.
3. The system must prevent multiple simultaneously active timers.
4. The system must allow creating manual time entries with task, start time, and end time.
5. The system must store entries persistently in SQLite.
6. The system must list recent entries in the UI.
7. The system must allow deleting existing entries from the UI.
8. The system must expose API endpoints for status, list, create/start, stop, manual create, and delete.
9. The system must be deployable via Docker and routable through Traefik on `clock.orchestrio.li`.
10. The UI must avoid mobile input auto-zoom by using mobile-safe input sizing.
