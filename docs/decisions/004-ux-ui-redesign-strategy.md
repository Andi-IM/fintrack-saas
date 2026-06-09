# ADR-004: UX/UI Optimization and Redesign Strategy

## Status
Accepted

## Supersedes
None

## Context
The FinTrack SaaS application has a strong foundational design with its Indigo visual identity and localized Indonesian payment paradigms. however, several significant usability gaps have been identified that disrupt the user experience and risk data integrity. Key pain points include currency formatting bugs (amounts displaying with an "I" suffix), a missing date picker in manual entry, aggressive text truncation in data tables, and a lack of loading/progress feedback during smart extraction.

## Decision
We will implement a prioritized UX/UI improvement backlog to transition the platform from a functional prototype to a production-grade financial tool. The strategy focuses on technical design solutions that prioritize data integrity and user trust.

### 1. Prioritized Backlog

| Priority | Issue | Solution |
| :--- | :--- | :--- |
| **Critical** | Currency Logic | Use `Intl.NumberFormat('id-ID')` for consistent IDR formatting. |
| **Critical** | Manual Date Entry | Implement a `shadcn/ui` Calendar-based DatePicker. |
| **Critical** | OCR Feedback | Add `Skeleton` loaders and `Progress` bars during AI processing. |
| **High** | Category Integrity | Replace free-text inputs with a `Combobox` (Autocomplete). |
| **High** | Table Density | Use `Tooltips` for truncated notes and fixed table layouts. |
| **High** | Navigation | Decouple Sidebar links from Modals; use explicit Quick Actions. |
| **Medium** | Empty States | Design Zero State components with actionable CTAs. |
| **Medium** | Breadcrumbs | Add navigation trails and "Back" buttons on review screens. |

### 2. Technical Design Specifications

#### A. Data Formatting
- Centralize all currency logic in `lib/utils.ts` or a dedicated `lib/format.ts`.
- Use `react-number-format` for real-time thousands separation in inputs.

#### B. The "Reviewer" Layout
- Implement a **Side-by-Side Reviewer** for receipt uploads (50/50 split on large screens).
- Ensure the source document (image) remains sticky while the user scrolls the extracted data form.

#### C. Smart Extraction State
- Transition from blocking modals to in-page loading states.
- Use `Skeleton` pulses for individual form fields while data is being extracted by the AI.

## Consequences
- **Positive**: Increased user trust through professional and localized data formatting.
- **Positive**: Improved data consistency and reduced entry errors via structured inputs (Date/Category).
- **Positive**: Enhanced perceived performance through better feedback during long-running OCR tasks.
- **Trade-off**: Additional development overhead for implementing more complex UI components and state management.

## Related Notes
- See `components/FinanceTracker.tsx` for initial implementations of the split-screen reviewer.
- Refactor sidebar logic to align with the new navigation paradigm.
