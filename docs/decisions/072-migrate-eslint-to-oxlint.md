# ADR-072: Migrate Frontend Linting from ESLint to Oxlint

## Status
Accepted

## Context
The frontend uses TypeScript 7.0 (native compiler). `typescript-eslint` depends on the JavaScript TypeScript compiler API and rejects TS 7.0 ("typescript-eslint does not support TS 7.0"), so `eslint .` fails to run. The existing ESLint configuration only enabled `@next/eslint-plugin-next` rules (recommended and core-web-vitals); it did not use type-aware rules. CI does not run the lint script.

## Decision
Replace ESLint with Oxlint in `frontend/`:
- Remove `eslint`, `eslint-config-next`, `@next/eslint-plugin-next`, `@typescript-eslint/*`, and `typescript-eslint-language-service`; remove the language-service plugin from `tsconfig.json`.
- Add `oxlint` with `.oxlintrc.json` (plugins: typescript, react, nextjs, import; `correctness` category as errors).
- `pnpm lint` runs `oxlint`.
- Delete `eslint.config.mjs` and `.eslintrc.json` from `frontend/`.
- The `frontend/e2e` workspace keeps its own ESLint setup for now.

## Alternatives Considered
- **Pin TypeScript 6 for ESLint**: works, but keeps two TypeScript versions and depends on peer-dependency resolution.
- **Biome**: also independent of TypeScript, but its Next.js rule coverage is smaller than Oxlint's built-in `nextjs` plugin.
- **Wait for typescript-eslint TS 7 support**: leaves lint broken for an unknown time.

## Consequences
- Positive: lint works with TS 7, is much faster, and needs fewer dependencies.
- Trade-offs: no type-aware rules or ESLint-only plugins. Rule names and coverage differ from ESLint.
- Risk: new Oxlint diagnostics may surface existing issues that need fixing or tuning.

## Related Notes
- `frontend/.oxlintrc.json`, `frontend/package.json`, `frontend/tsconfig.json`
- `frontend/e2e/` still uses ESLint.
