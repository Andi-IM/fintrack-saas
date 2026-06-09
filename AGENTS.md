# Architectural Context & ADR Workflow

You are working on a project that utilizes Architectural Decision Records (ADRs) to document important technical decisions. To maintain consistency and understand the project context, you MUST follow these rules for every user request:

1. **Review Existing Decisions:** Before implementing new features or making architectural changes, you must review the existing ADRs stored in the `docs/decisions/` directory. This allows you to understand the project context, existing constraints, and past decisions without having to read every single file in the repository.
2. **Document New Decisions:** If a user requests a new feature or technical implementation that requires a new technical decision (e.g., changes to architecture, data models, integrations, deployment, security, or performance) and it is not covered by an existing ADR, you MUST create a new ADR document to record this decision.
3. **ADR Formatting Rules:**
   - Store the new ADR in the `docs/decisions/` directory.
   - Use sequential numbering for the filename (e.g., `003-new-feature-name.md`).
   - Use the following Markdown structure, written in English:
     - `# ADR-XXX: [Decision Title]`
     - `## Status` (Proposed / Accepted / Rejected / Deprecated)
     - `## Supersedes` (Optional, indicate if it replaces a previous ADR)
     - `## Context` (Explain the problem, needs, and constraints)
     - `## Decision` (Clearly state the final decision)
     - `## Alternatives Considered` (Other options evaluated and why they were rejected)
     - `## Consequences` (Positive impacts, trade-offs, risks, and implications)
     - `## Related Notes` (Optional, links to related files or components)
