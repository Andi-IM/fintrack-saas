'use server'

import { getAuthService } from '@/lib/auth'
import { OriginResolver, DefaultOriginResolver } from './auth-helpers'
import { ActionResponse } from '@/lib/actions/types'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { z } from 'zod'

const authCredentialsSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal harus 6 karakter'),
})

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

export async function loginWithCredentials(input: unknown): Promise<ActionResponse> {
  const result = authCredentialsSchema.safeParse(input)
  if (!result.success) {
    const errorMsg = result.error.issues[0]?.message || 'Input tidak valid'
    return { success: false, error: errorMsg }
  }

  const { email, password } = result.data

  const authorizedEmail = process.env.AUTHORIZED_EMAIL || 'ci@example.com'
  if (email.toLowerCase() !== authorizedEmail.toLowerCase()) {
    return { success: false, error: 'Email ini tidak terdaftar sebagai email resmi (unauthorized).' }
  }

  try {
    const authService = getAuthService()
    const { error } = await authService.loginWithPassword(email, password)
    if (error) {
      return { success: false, error: error.message }
    }
    
    redirect('/')
  } catch (error) {
    if (isRedirectError(error)) throw error
    console.error('Login credentials error:', error)
    return { success: false, error: 'Terjadi kesalahan yang tidak terduga.' }
  }
}

export async function signUpWithCredentials(input: unknown): Promise<ActionResponse> {
  const result = authCredentialsSchema.safeParse(input)
  if (!result.success) {
    const errorMsg = result.error.issues[0]?.message || 'Input tidak valid'
    return { success: false, error: errorMsg }
  }

  const { email, password } = result.data

  const authorizedEmail = process.env.AUTHORIZED_EMAIL || 'ci@example.com'
  if (email.toLowerCase() !== authorizedEmail.toLowerCase()) {
    return { success: false, error: 'Email ini tidak terdaftar sebagai email resmi (unauthorized).' }
  }

  try {
    const authService = getAuthService()
    const { error } = await authService.signUpWithPassword(email, password)
    if (error) {
      return { success: false, error: error.message }
    }
    
    redirect('/')
  } catch (error) {
    if (isRedirectError(error)) throw error
    console.error('Signup credentials error:', error)
    return { success: false, error: 'Terjadi kesalahan yang tidak terduga.' }
  }
}

