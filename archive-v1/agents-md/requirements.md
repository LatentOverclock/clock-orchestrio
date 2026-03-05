# Requirements Template (for `project.md`)
This file is a **guideline/template** for creating project requirements.
It is **not** the source of truth for a concrete app.

For real projects, keep requirements in the project root:
- `project.vN.md` files contain requirement changes/deltas
- `project.md` contains the latest consolidated state
- requirement changes should be added as versioned delta files first, then consolidated into `project.md` by the agent

### Relation between `project.md` and `agents-md/implementation.md`
Project requirements (`project.md`) must be validated against `agents-md/implementation.md` before implementation.
If there are contradictions, project requirements must be adjusted to satisfy `implementation.md`.

### Versioning (mandatory)
When requirements change, the implementation flow must follow this sequence:

1. Create a new revision file: `project.v{N+1}.md` (delta from previous version).
2. Update `project.md` so it contains the consolidated latest requirements.
3. Ensure the version title in `project.md` matches the highest revision (e.g. `Project Requirements v3`).
4. Implement code changes according to the resulting `project.md`.

Do not skip step (1) when requirement scope/behavior changes.

### Human-in-the-loop (HITL)
If requirements are added/edited by a human, the agent should perform the consolidation into `project.md` and ensure the version title/state are consistent before implementation.

## Prompt Template
> Can you please generate some example-requirements for an application?
> The requirements should be kind of specific (not to generic).
> 
> ### Base Requirements
>  - Only web-applications for frontend. No native apps.
>  - The system shall be usable on modern desktop and/or mobile browsers.
> 
> ### Restrictions
>  - not more than 10 functional requirements (base requirements excluded)
> - no non-functional requirements
