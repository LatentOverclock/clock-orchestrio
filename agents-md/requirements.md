# Requirements Template (for `project.md`)
This file is a **guideline/template** for creating project requirements.
It is **not** the source of truth for a concrete app.

For real projects, keep requirements in the project root:
- `project.vN.md` files contain requirement changes/deltas
- `project.md` contains the latest consolidated state
- requirement changes should be added as versioned delta files first, then consolidated into `project.md` by the agent

### Relation to `implementation.md`
Project requirements (`project.md`) must be validated against `agents-md/implementation.md` before implementation.
If there are contradictions, project requirements must be adjusted to satisfy `implementation.md`.

## Template
Can you please generate some example-requirements for an application?
The requirements should be kind of specific (not to generic).

### Base Requirements
 - Only web-applications for frontend. No native apps.
 - The system shall be usable on modern desktop and/or mobile browsers.

### Restrictions
 - not more than 10 functional requirements (base requirements excluded)
 - no non-functional requirements
