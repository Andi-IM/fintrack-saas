'use server'

import { getAuthService } from '@/lib/auth'
import { OriginResolver, DefaultOriginResolver } from './auth-helpers'

export async function login(originResolver?: OriginResolver | FormData): Promise<void> {
  const resolver = (originResolver && 'resolve' in originResolver) ? originResolver : new DefaultOriginResolver()
  const origin = await resolver.resolve()
  
  const authService = getAuthService()
  await authService.login(origin)
}

export async function logout(): Promise<void> {
  const authService = getAuthService()
  await authService.logout()
}

