import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { login, logout } from '../actions/auth'
import { resolveAuthOrigin, DefaultOriginResolver } from '../actions/auth-helpers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

describe('auth server actions', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('DefaultOriginResolver', () => {
    it('resolves APP_URL when present', async () => {
      process.env.APP_URL = 'https://my-app.com'
      const resolver = new DefaultOriginResolver()
      const result = await resolver.resolve()
      expect(result).toBe('https://my-app.com')
    })

    it('resolves VERCEL_URL when present and APP_URL is absent', async () => {
      delete process.env.APP_URL
      process.env.NEXT_PUBLIC_VERCEL_URL = 'my-vercel.vercel.app'
      const resolver = new DefaultOriginResolver()
      const result = await resolver.resolve()
      expect(result).toBe('https://my-vercel.vercel.app')
    })

    it('falls back to x-forwarded-host header', async () => {
      delete process.env.APP_URL
      delete process.env.NEXT_PUBLIC_VERCEL_URL
      
      const mockHeaders = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'x-forwarded-host') return 'x-host.com'
          if (key === 'x-forwarded-proto') return 'https'
          return null
        })
      }
      vi.mocked(headers).mockResolvedValue(mockHeaders as any)

      const resolver = new DefaultOriginResolver()
      const result = await resolver.resolve()
      expect(result).toBe('https://x-host.com')
    })

    it('falls back to host header and localhost logic', async () => {
      delete process.env.APP_URL
      delete process.env.NEXT_PUBLIC_VERCEL_URL

      const mockHeaders = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'host') return 'localhost:3000'
          return null
        })
      }
      vi.mocked(headers).mockResolvedValue(mockHeaders as any)

      const resolver = new DefaultOriginResolver()
      const result = await resolver.resolve()
      expect(result).toBe('http://localhost:3000')
    })
  })

  describe('resolveAuthOrigin', () => {
    it('resolves origin successfully', async () => {
      process.env.APP_URL = 'https://env-app.com'
      const result = await resolveAuthOrigin()
      expect(result).toBe('https://env-app.com')
    })
  })

  describe('login', () => {
    it('signs in with OAuth and redirects to the oauth provider url', async () => {
      const mockSupabase = await createClient()
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { url: 'https://github.com/oauth-login-url' },
        error: null,
      })
      mockSupabase.auth.signInWithOAuth = mockSignIn

      const mockResolver = {
        resolve: vi.fn().mockResolvedValue('https://test-origin.com')
      }

      await login(mockResolver)

      expect(mockSignIn).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          redirectTo: 'https://test-origin.com/auth/callback',
        },
      })
      expect(redirect).toHaveBeenCalledWith('https://github.com/oauth-login-url')
    })

    it('redirects back to login page on OAuth initiation error', async () => {
      const mockSupabase = await createClient()
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { url: null },
        error: new Error('GitHub provider failed'),
      })
      mockSupabase.auth.signInWithOAuth = mockSignIn

      const mockResolver = {
        resolve: vi.fn().mockResolvedValue('https://test-origin.com')
      }

      await login(mockResolver)

      expect(redirect).toHaveBeenCalledWith('/login?message=GitHub%20provider%20failed')
    })
  })

  describe('logout', () => {
    it('calls signOut and redirects to login page', async () => {
      const mockSupabase = await createClient()
      const mockSignOut = vi.fn().mockResolvedValue({ error: null })
      mockSupabase.auth.signOut = mockSignOut

      await logout()

      expect(mockSignOut).toHaveBeenCalledTimes(1)
      expect(redirect).toHaveBeenCalledWith('/login')
    })
  })
})
