# ADR-043: Server Action Error Handling and Redirect Preservation Pattern

## Status
Accepted

## Context
In Next.js App Router, the `redirect()` and `notFound()` functions operate by throwing a special internal error (e.g., `NEXT_REDIRECT`). During our E2E testing phase, we discovered a widespread issue where form submissions were successfully writing data to the database, but the UI was failing to navigate the user to the next page. 
Investigation revealed that global `try/catch` blocks inside our Repository layer and Server Actions were broadly catching `error instanceof Error` and returning standard error responses. Because the `redirect()` throw was swallowed by these catch blocks, Next.js aborted the navigation flow silently.

## Decision
To ensure robust error handling without breaking Next.js navigational invariants, we decided to:
1. **Mandate the `isRedirectError` Pattern**: Every `catch (error)` block within a Server Action or any function that calls `redirect()` MUST explicitly check if the error is a navigational error using the `isRedirectError(error)` helper provided by `next/dist/client/components/redirect`.
2. **Immediate Re-Throw**: If the error is a redirect, it must be immediately re-thrown before any logging or fallback logic executes.

## Alternatives Considered
- **Avoid Try-Catch Entirely**: Moving the `redirect()` call outside the `try/catch` block. While viable in some scenarios, it often forces developers to use clumsy state variables (`let shouldRedirect = false; let redirectUrl = ''`) and complicates the code structure significantly.
- **Custom Error Classes**: Throwing only custom domain errors and catching them specifically. Rejected because standardizing Next.js's native redirect mechanism is more idiomatic than building custom routing abstraction layers.

## Consequences
- **Positive**: Post-mutation navigations (`redirect`) execute successfully. E2E tests simulating user flows will properly transition between pages.
- **Negative**: Developers must remember to import and apply `isRedirectError` on every new Server Action that contains a `redirect()` call within a `try` block. Forgetting this will resurrect the silent failure bug.

## Implementation Plan
- **Affected paths**: 
  - `frontend/features/*/actions/*.ts`
  - `frontend/lib/repositories/*.ts`
- **Pattern**: 
  ```typescript
  import { redirect } from 'next/navigation'
  import { isRedirectError } from 'next/dist/client/components/redirect'

  export async function myServerAction(data) {
    try {
      await db.insert(data)
      redirect('/success')
    } catch (error) {
      if (isRedirectError(error)) throw error; // CRITICAL: Preserve redirect
      
      console.error(error)
      return { status: 'error', message: 'Something went wrong' }
    }
  }
  ```

## Verification
- [x] E2E form submissions (like Cash Flow and Receipts) successfully navigate to the destination page.
- [x] Server Actions correctly return `{ status: 'error' }` for true operational errors, while executing `307 Temporary Redirect` responses when `redirect()` is invoked.

