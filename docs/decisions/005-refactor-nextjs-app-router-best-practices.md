# ADR-005: Refactor to Next.js App Router Best Practices

## Status
Accepted

## Supersedes
None

## Context
The current application architecture relies heavily on a single, monolithic Client Component (`FinanceTracker.tsx`, ~69KB) that runs entirely on the client side with the `"use client"` directive. This violates Next.js App Router best practices, which emphasize Server Components by default, structured route separation, and Server Actions for data mutations. The current monolithic approach results in suboptimal initial load times, prevents effective use of Server-Side Rendering (SSR), and lacks granular loading and error states (such as `loading.tsx` and `error.tsx`).

## Decision
Refactor the application to strictly adhere to Next.js App Router best practices as defined in our guidelines:
1. **Server Components by Default**: Move data fetching logic and non-interactive UI structure out of the monolithic `FinanceTracker.tsx` into Server Components (starting with `app/page.tsx`).
2. **Modularization**: Break down `FinanceTracker.tsx` into smaller, focused, and reusable components within the `components/` directory.
3. **Server Actions**: Implement all Supabase database mutations (e.g., creating, updating, deleting transactions) via Server Actions located in the `lib/actions/` directory.
4. **Native Routing States**: Introduce `app/loading.tsx` and `app/error.tsx` to handle async boundaries and errors gracefully, replacing custom client-side loading states where applicable.
5. **Targeted Client Components**: Restrict the use of `"use client"` strictly to leaf components that require user interactivity, event handlers, or React hooks (`useState`, `useEffect`).

## Alternatives Considered
- **Maintain the Monolithic Client Component**: While requiring less immediate refactoring effort, this approach hurts performance, maintainability, and limits future scalability.
- **Client-Side Data Fetching (e.g., React Query or SWR)**: Effective for Single Page Applications (SPAs), but less efficient than leveraging the App Router's native server-side data fetching and caching mechanisms.

## Consequences
- **Positive**: Significantly smaller client bundle size, leading to faster Time to Interactive (TTI) and overall better performance.
- **Positive**: Improved maintainability and scalability through component modularization and separation of concerns.
- **Positive**: Enhanced security and efficiency by executing data fetching and complex logic securely on the server.
- **Trade-off**: Requires significant upfront refactoring effort to untangle existing client-side states from the UI structure.

## Related Notes
- Guided by the `nextjs-best-practices` skill documentation.
- Refer to `docs/decisions/003-integrate-supabase.md` for existing database integration context.
