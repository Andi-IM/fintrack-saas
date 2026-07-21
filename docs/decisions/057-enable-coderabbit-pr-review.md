# ADR-057: Enable CodeRabbit Pull Request Review

## Status
Accepted

## Context
Pull requests benefit from a consistent automated review pass before merge. The repository already uses GitHub pull requests, automated testing, and release workflows, but there is no repository-level CodeRabbit configuration checked into version control.

CodeRabbit supports repository configuration through a `.coderabbit.yaml` file at the repository root. The configuration in the branch under review is automatically detected and used for that pull request.

## Decision
Add a root-level `.coderabbit.yaml` file to enable CodeRabbit automatic pull request reviews, including draft pull requests.

The configuration keeps review behavior non-blocking by disabling the request-changes workflow while still enabling high-level summaries, review status, detailed review output, and chat auto-replies.

## Alternatives Considered
- Use only CodeRabbit repository or organization UI settings. Rejected because repository file configuration is version-controlled and visible in pull requests.
- Trigger reviews only manually with PR comments. Rejected because automatic review gives more consistent coverage.
- Enable request-changes workflow. Rejected for now because automated review should provide feedback without blocking maintainers until the team calibrates signal quality.

## Consequences
- Positive: Pull requests receive consistent automated review feedback.
- Positive: CodeRabbit behavior is reviewed and versioned with the repository.
- Positive: Draft PRs can be reviewed before they are marked ready.
- Trade-off: CodeRabbit must be installed and allowed to access this repository for the configuration to take effect.
- Risk: Review noise may need future tuning through `.coderabbit.yaml`.

## Related Notes
- CodeRabbit configuration: `.coderabbit.yaml`
- Existing pull request workflow: ADR-031
