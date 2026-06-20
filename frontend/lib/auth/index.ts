import { AuthService } from './types'
import { SupabaseAuthService } from './supabase-auth'

let authServiceInstance: AuthService | null = null

export function getAuthService(): AuthService {
  if (authServiceInstance) {
    return authServiceInstance
  }

  // Use FakeAuthService if BYPASS_AUTH is active and we're not in production
  if (
    process.env.BYPASS_AUTH === 'true' && 
    (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_IS_TESTING === 'true')
  ) {
    const { FakeAuthService } = require('./fake-auth')
    authServiceInstance = new FakeAuthService()
  } else {
    authServiceInstance = new SupabaseAuthService()
  }

  return authServiceInstance!
}
