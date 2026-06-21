import { cache } from 'react'
import { getAuthService } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'

/**
 * Fetches the current authenticated user, cached per request cycle using React.cache().
 * This guarantees that no matter how many Server Components call this function,
 * only a single network round-trip to Supabase is made per HTTP request.
 *
 * Auth redirection is handled by middleware.ts — this function returns null
 * if the user is not authenticated instead of redirecting.
 */
export const getCachedUser = cache(async (): Promise<User | null> => {
  const authService = getAuthService()
  const {
    data: { user },
  } = await authService.getUser()
  return user
})
