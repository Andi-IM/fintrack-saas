/**
 * Standardized Server Action response type.
 *
 * Uses a TypeScript Discriminated Union so callers can narrow
 * the result with a simple `if (result.success)` check instead
 * of relying on thrown errors that trigger the Error Boundary.
 */
export type ActionResponse<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
