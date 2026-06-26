import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, logout, loginWithCredentials, signUpWithCredentials } from '@/features/auth/actions/auth'
import { getAuthService } from '@/lib/auth'
import { FakeAuthService } from '@/lib/auth/fake-auth'
import { redirect } from 'next/navigation'

// Mock getAuthService
vi.mock('@/lib/auth', () => ({
  getAuthService: vi.fn(),
}))

// Mock DefaultOriginResolver from '@/features/auth/actions/auth-helpers' to return a fixed origin
vi.mock('@/features/auth/actions/auth-helpers', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/auth/actions/auth-helpers')>()
  return {
    ...original,
    DefaultOriginResolver: class {
      resolve = vi.fn().mockResolvedValue('https://mocked-default-origin.com')
    }
  }
})

describe('Auth Actions', () => {
  let fakeAuthService: FakeAuthService

  beforeEach(() => {
    vi.clearAllMocks()
    fakeAuthService = new FakeAuthService()
    vi.mocked(getAuthService).mockReturnValue(fakeAuthService)
    
    // Spy on fakeAuthService methods to prevent them from executing actual NextJS headers/navigation redirects
    vi.spyOn(fakeAuthService, 'login').mockImplementation(async () => {})
    vi.spyOn(fakeAuthService, 'logout').mockImplementation(async () => {})
    vi.spyOn(fakeAuthService, 'loginWithPassword').mockImplementation(async () => ({ error: null }))
    vi.spyOn(fakeAuthService, 'signUpWithPassword').mockImplementation(async () => ({ error: null }))
  })

  describe('login', () => {
    it('should resolve origin using DefaultOriginResolver when no resolver is provided and call login', async () => {
      await login()
      expect(fakeAuthService.login).toHaveBeenCalledWith('https://mocked-default-origin.com')
    })

    it('should resolve origin using custom resolver and call login', async () => {
      const mockResolver = {
        resolve: vi.fn().mockResolvedValue('https://custom-origin.com')
      }
      await login(mockResolver)
      expect(mockResolver.resolve).toHaveBeenCalled()
      expect(fakeAuthService.login).toHaveBeenCalledWith('https://custom-origin.com')
    })

    it('should fallback to DefaultOriginResolver when FormData is provided', async () => {
      const formData = new FormData()
      await login(formData)
      expect(fakeAuthService.login).toHaveBeenCalledWith('https://mocked-default-origin.com')
    })
  })

  describe('logout', () => {
    it('should call authService.logout', async () => {
      await logout()
      expect(fakeAuthService.logout).toHaveBeenCalled()
    })
  })

  describe('loginWithCredentials', () => {
    it('should fail validation with invalid input', async () => {
      const result = await loginWithCredentials({ email: 'invalid-email', password: '123' })
      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Format email tidak valid')
    })

    it('should fail validation with unauthorized email', async () => {
      const result = await loginWithCredentials({ email: 'unauthorized@example.com', password: 'password123' })
      expect(result.success).toBe(false)
      expect((result as any).error).toContain('tidak terdaftar sebagai email resmi')
    })

    it('should call loginWithPassword and redirect to / on success', async () => {
      process.env.AUTHORIZED_EMAIL = 'authorized@example.com'
      const result = await loginWithCredentials({ email: 'authorized@example.com', password: 'password123' })
      
      expect(fakeAuthService.loginWithPassword).toHaveBeenCalledWith('authorized@example.com', 'password123')
      expect(redirect).toHaveBeenCalledWith('/')
    })

    it('should return error when loginWithPassword fails', async () => {
      process.env.AUTHORIZED_EMAIL = 'authorized@example.com'
      vi.spyOn(fakeAuthService, 'loginWithPassword').mockResolvedValueOnce({ error: { message: 'Invalid credentials' } })
      
      const result = await loginWithCredentials({ email: 'authorized@example.com', password: 'password123' })
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('Invalid credentials')
    })
  })

  describe('signUpWithCredentials', () => {
    it('should fail validation with invalid input', async () => {
      const result = await signUpWithCredentials({ email: 'invalid-email', password: '123' })
      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Format email tidak valid')
    })

    it('should fail validation with unauthorized email', async () => {
      const result = await signUpWithCredentials({ email: 'unauthorized@example.com', password: 'password123' })
      expect(result.success).toBe(false)
      expect((result as any).error).toContain('tidak terdaftar sebagai email resmi')
    })

    it('should call signUpWithPassword and redirect to / on success', async () => {
      process.env.AUTHORIZED_EMAIL = 'authorized@example.com'
      const result = await signUpWithCredentials({ email: 'authorized@example.com', password: 'password123' })
      
      expect(fakeAuthService.signUpWithPassword).toHaveBeenCalledWith('authorized@example.com', 'password123')
      expect(redirect).toHaveBeenCalledWith('/')
    })

    it('should return error when signUpWithPassword fails', async () => {
      process.env.AUTHORIZED_EMAIL = 'authorized@example.com'
      vi.spyOn(fakeAuthService, 'signUpWithPassword').mockResolvedValueOnce({ error: { message: 'User already exists' } })
      
      const result = await signUpWithCredentials({ email: 'authorized@example.com', password: 'password123' })
      expect(result.success).toBe(false)
      expect((result as any).error).toBe('User already exists')
    })
  })
})

