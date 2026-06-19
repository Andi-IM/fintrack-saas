# ADR-033: Migrate Frontend to Feature-Based Architecture

## Status
Accepted

## Context
The current frontend codebase utilizes a layer-based structure (e.g., `components/`, `hooks/`, `lib/actions/`). While easy to start with, this setup leads to:
- **Low Cohesion:** Code related to a single business concept (e.g., Receipts, Bank Statements, Auth) is scattered across multiple directories.
- **Cognitive Load:** Developers must open files from multiple top-level directories to make a single feature change.
- **Maintainability Challenges:** As the codebase grows, it becomes harder to isolate features, manage test boundaries, and enforce domain boundaries.

Organizing the codebase by features (e.g., `features/auth`, `features/cash-flow`, `features/receipts`, `features/bank-statements`) increases local cohesion and makes features self-contained.

## Decision
We will migrate the Next.js frontend code from a layer-based structure to a feature-based structure under `frontend/features/`.
For consistency with standard Next.js layouts, we will scaffold:
`frontend/features/[feature-name]/`
with subfolders:
- `components/` - Feature-specific UI components
- `hooks/` - Feature-specific react hooks
- `actions/` - Server Actions related to the feature
- `__tests__` - Tests targeting this feature

### Defined Feature Modules:
1. **`auth`**: Login, registration, session management.
2. **`cash-flow`**: Cash flow components, controllers, and database actions.
3. **`receipts`**: Receipt list, edit receipts, ScanDialog, OCR client-side state, and receipt database actions.
4. **`bank-statements`**: Bank statement listing, parsing actions, statements database actions.

### Shared & Core:
- Generic UI elements remain in `frontend/components/ui/` (Shadcn UI).
- Layout-level components remain in `frontend/components/layout/`.
- Cross-cutting concerns and utils remain in `frontend/lib/` or `frontend/hooks/` (e.g., `use-mobile.ts`).

## Alternatives Considered
- **Maintain Current Structure:** Rejected because the file scattering makes extending features (like cash-flow analytics and OCR parsing) increasingly complex and error-prone.
- **Feature-Sliced Design (FSD) strict spec:** Rejections due to excessive overhead (layers like app, processes, pages, features, entities, shared). A simplified feature-based structure under `features/` is lighter and easier to adopt.

## Consequences
- **Positive:**
  - High cohesion: all files related to `receipts` are in a single place.
  - Simpler developer workflow: less navigation between distant folders.
  - Isolated testing: tests live directly alongside the features they cover.
- **Trade-offs:**
  - Requires updating all relative and absolute imports (e.g., aliased `@/components/...`).
  - Temporary risk of build/test breakage during migration.
- **Action Plan:**
  1. Approve ADR.
  2. Create folders under `frontend/features/`.
  3. Move files iteratively.
  4. Fix imports.
  5. Run compiler and tests to verify.

## Related Notes
- Refactoring roadmap and file paths will be mapped in the migration plan.
