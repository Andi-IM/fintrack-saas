---
status: proposed
date: 2026-06-19
decision-makers: [USER, Antigravity]
---

# ADR-031: Implement Semantic Release for Automated Versioning and Release Management

## Context and Problem Statement

We want to automate version management, changelog generation, and package publishing/release flows for the `fintrack-saas` project. Manual version bumps, git tag creation, and manual changelog edits are error-prone and slow down deployment. To resolve this, we want to establish automated releases that follow **Semantic Versioning (SemVer)** rules based on standard commit messages.

## Decision

We will adopt **Semantic Release** using GitHub Actions to automate version management, tag generation, changelog updates, and release notes creation.

### Rules & Configuration

1. **Commit Message Format**: We enforce **Conventional Commits** (e.g. `feat: ...` for a minor version bump, `fix: ...` for a patch, and breaking changes for a major bump).
2. **Branch Config**: Semantic releases will be triggered automatically when changes are pushed or merged into the production release branch (`main`). Pre-releases can also run on the `dev` branch if configured.
3. **Plugins Used**:
   - `@semantic-release/commit-analyzer` to determine the next SemVer version.
   - `@semantic-release/release-notes-generator` to generate release notes from commit comments.
   - `@semantic-release/changelog` to update `CHANGELOG.md` in the repository.
   - `@semantic-release/git` to commit the updated `CHANGELOG.md` and modified package files back to the repository.
   - `@semantic-release/github` to publish GitHub releases and add release comments to PRs/issues.

## Alternatives Considered

- **Standard Version**: Lacked full automation in GitHub Actions without writing complex shell scripts.
- **Lerna / Changesets**: Overly complex since we do not publish multiple public npm packages.

## Consequences

- **Good**: Zero-overhead versioning: merging a PR to `main` automatically computes the version, tags git, writes changelogs, and creates a GitHub Release.
- **Good**: Eliminates human mistakes in release notes and SemVer calculation.
- **Bad**: Requires developers to strictly follow Conventional Commits.
