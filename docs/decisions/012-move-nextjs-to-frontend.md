# ADR-012: Move Next.js Frontend to front-end Directory

## Status
Accepted

## Context
The project was originally set up with the Next.js frontend code in the root directory. To clean up the root directory and allow for potential future monorepo structure (e.g., adding a backend service or separating concerns), we need to move all Next.js frontend-related files and directories into a dedicated `frontend` directory.

## Decision
We will move all Next.js-related source files, configurations, and dependency manifests to the `frontend` directory. 
Specifically, the following will be moved:
- Directories: `app`, `components`, `hooks`, `lib`
- Configuration files: `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `tsconfig.tsbuildinfo`, `components.json`, `.eslintrc.json`
- Dependency manifests: `package.json`, `pnpm-lock.yaml`
- Environment files: `.env`, `.env.example`
- Git ignores and TypeScript declarations: `next-env.d.ts`, `.gitignore` (keep a copy or standard .gitignore at root, and put one in frontend)
- Middleware: `middleware.ts`

To preserve Git history, we will use `git mv` for tracked files.
We will delete the local `node_modules` and `.next` folders from the root to speed up the move, then run `pnpm install` in the `frontend` directory to restore dependencies.

## Alternatives Considered
- **Keep the current structure**: Rejected because it makes the root directory cluttered and harder to introduce other services/modules in the future.
- **Move only source files and keep config at root**: Rejected because Next.js configuration files, TypeScript configuration, and ESLint configurations should reside where the code is to avoid path mapping complexity and build tool configuration issues.

## Consequences
- The root directory will be clean, containing only workspace-level folders (`docs/`, `supabase/`, `frontend/`, `assets/`, etc.).
- Commands to run the frontend must be executed from the `frontend` directory (e.g., `cd frontend && pnpm dev`), or root-level scripts can be added to delegate commands to the `frontend` folder.
- Any CI/CD pipelines, build configurations, or deployment tasks will need to be updated to point to the `frontend` subdirectory.
