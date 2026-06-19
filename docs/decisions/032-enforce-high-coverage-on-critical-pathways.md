---
status: proposed
date: 2026-06-19
decision-makers: [USER, Antigravity]
---

# ADR-032: Enforce High Test Coverage on Critical Pathways to Prevent Critical Regressions

## Context and Problem Statement

A low global coverage threshold (e.g. 12%) is insufficient to guarantee that critical user actions (such as uploading financial statements, executing database mutations, or parsing transactions) do not fail unexpectedly. We need a way to ensure that critical features are highly tested, without necessarily forcing 80%+ test coverage on non-critical presentation components (like styling wrappers, layouts, or menus).

## Decision

We will define **Critical Pathways** within the codebase and enforce a strict **80% Statement and Function coverage threshold** specifically on those paths using Vitest coverage configuration.

### Critical Pathways Definition

The following directories are identified as Critical Pathways because their failure directly breaks core financial capabilities:
1. `lib/actions/` (Server Actions interacting with Supabase and executing mutations).
2. `lib/utils/` (Logic parsing bank statements, localized formatting, and math formulas).
3. `components/transactions/` (Forms handling cash flow logs, edits, and receipts verification).

### Configuration Standard

* **Folder-specific Thresholds:** Rather than a global threshold that averages out coverage, we will configure folder-level thresholds in `vitest.config.ts`.
* **Gate Requirements:** Critical pathway folders must achieve at least **80% Statement and Function coverage**.
* **Exceptions:** Presentational, styling components, and test helpers are excluded from these high gates to allow developers to rapidly prototype UI.

## Consequences

* **Good:** Guarantees that critical code paths (calculators, parsing logic, and DB insertions) are heavily tested, preventing regression failures on core flows.
* **Good:** Allows developers to deploy UI revisions quickly without blocking builds on minor layout coverage drops.
* **Bad:** Writing tests for server actions requires setting up thorough mock interfaces for Supabase requests.
