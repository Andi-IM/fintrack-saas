import { cache } from 'react'
import { headers } from 'next/headers'
import { getAuthService } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'

/**
 * Fetches the current authenticated user, cached per request cycle using React.cache().
 * Checks for headers forwarded from middleware to avoid double fetching during prefetch.
 * 
 * Auth redirection is handled by middleware.ts — this function returns null
 * if the user is not authenticated instead of redirecting.
 */
export const getCachedUser = cache(async (): Promise<Pick<User, 'id' | 'email'> | null> => {
  const headersList = await headers()
  const email = headersList.get('x-user-email')
  const id = headersList.get('x-user-id')

  if (email && id) {
    // Return partial user object using data validated and forwarded by middleware
    // This avoids redundant Supabase network calls during RSC prefetching
    return { id, email }
  }

  // Fallback: make actual network call if headers are not available 
  const authService = getAuthService()
  const {
    data: { user },
  } = await authService.getUser()
  return user
})
