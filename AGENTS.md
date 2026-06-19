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

# Semantic Release & Commit Rules

To support automated versioning and releases, you MUST follow these standards for all commits and pull requests:

1. **Commit Message Format**: Follow Conventional Commits format strictly.
   - `feat: ...` for a new feature (triggers a minor version bump).
   - `fix: ...` for a bug fix (triggers a patch version bump).
   - `docs: ...` for documentation modifications (does not trigger a release).
   - `style: ...` for code formatting changes (does not trigger a release).
   - `refactor: ...` for code refactoring (does not trigger a release).
   - `perf: ...` for performance improvements (triggers a patch version bump).
   - `test: ...` for adding/updating tests (does not trigger a release).
   - `chore: ...` for package/build changes (does not trigger a release).
   - Use `BREAKING CHANGE:` or `!` after the type/scope for breaking changes (triggers a major version bump).
2. **Release Workflows**:
   - Pushes to the `dev` branch trigger automatic Semantic Pre-releases (`rc` prerelease versions).
   - Pushes/merges to the `main` branch trigger production releases (stable versions).
   - The release workflow generates release tags, updates `CHANGELOG.md`, updates versioning files, and publishes release info to GitHub.
