---
status: accepted
date: 2026-06-19
decision-makers: [USER, Antigravity]
---

# ADR-030: Adopt Vitest and React Testing Library for Frontend Testing

## Context and Problem Statement

FinTrack SaaS currently has no automated testing framework configured for the Next.js frontend app (`ai-studio-applet`). Without test coverage on core pathways (such as statement parsing, OCR text correction, and transaction management forms), code changes risk introducing critical regressions that block users from completing vital flows. We need a fast, modern testing setup that integrates easily with Next.js and React 19 to safeguard core user flows.

## Decision

We will adopt **Vitest** as our test runner and **React Testing Library** for component/integration testing in the frontend project.

### Core Strategies
1. **Runner selection**: Vitest will be used instead of Jest because of its native ES module support, out-of-the-box TypeScript parsing, and significantly faster execution speeds using Vite compilation.
2. **Component Testing**: React Testing Library (RTL) will be used to simulate user interactions on forms and transactional components (e.g. `CashFlowForm`, `ItemEditDialog`), verifying that layout flows work without blocking errors.
3. **Mocking**: Supabase clients, Next.js routers, and external OCR action API requests will be mocked to prevent side-effects in testing environments.

### Non-Goals
* Reaching 100% test coverage across all minor components.
* Implementing full End-to-End browser UI automation (Cypress / Playwright) in this phase.
* Implementing Visual Regression Testing.

## Consequences

* **Good**: Core features (cash flow submissions, statement actions) are guarded against regressions; developers receive rapid feedback via `npm run test`.
* **Good**: Faster compilation and test-watching using Vitest.
* **Bad**: Overhead of writing and maintaining mock interfaces for Next.js app navigation and Supabase server actions.

## Implementation Plan

- **Affected paths**: `frontend/package.json`, `frontend/vitest.config.ts`, `frontend/components/`, `frontend/__tests__/`
- **Dependencies**: Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@vitejs/plugin-react`, `jsdom` to devDependencies.
- **Patterns to follow**: 
  - Keep test files in proximity or inside `__tests__/` directory using `.test.tsx` or `.test.ts` extension.
  - Follow AAA (Arrange, Act, Assert) testing structures.
- **Patterns to avoid**: 
  - Avoid rendering deep nested DOM verification; test behavior rather than internal state representation.

### Verification

- [ ] Run `npm run test` or `vitest run` inside `/frontend` and assert exit code is 0.
- [ ] Ensure Vitest configuration initializes mock hooks for Next.js page routers.
