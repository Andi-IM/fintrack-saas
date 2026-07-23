# ADR-062: Enable CodeQL Code Scanning

## Status

Accepted

## Context

FinTrack SaaS handles authenticated financial data, private storage access, OCR parsing, and database-backed workflows. Existing CI covers tests, builds, coverage, release automation, CodeRabbit review, and performance checks, but there is no first-party GitHub code scanning workflow for static security analysis.

## Decision

Enable GitHub CodeQL code scanning with a dedicated GitHub Actions workflow. The workflow runs on pushes and pull requests targeting `main` and `dev`, plus a weekly scheduled scan.

The analysis matrix covers:

- `javascript-typescript` for the Next.js frontend and shared TypeScript code.
- `python` for the document reader service.

Both languages use CodeQL `build-mode: none` because the repository does not require a compiled build step for CodeQL extraction.

## Alternatives Considered

- **Rely only on tests and CodeRabbit**: Rejected because they do not provide GitHub-native code scanning alerts.
- **Run CodeQL only on `main`**: Rejected because security findings should be visible before merge through pull request checks.
- **Add third-party scanners first**: Deferred. CodeQL is the lowest-friction baseline and integrates directly with GitHub Security.

## Consequences

- Positive: Pull requests and protected branches receive first-party static security analysis.
- Positive: Weekly scans can detect findings from updated CodeQL queries even when application code is unchanged.
- Trade-off: CI gains an additional workflow and CodeQL alerts may require triage to separate true risks from false positives.

## Related Notes

- `.github/workflows/codeql.yml`
- GitHub code scanning alerts
