import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, logout } from '../actions/auth'
import { getAuthService } from '@/lib/auth'
import { FakeAuthService } from '@/lib/auth/fake-auth'

// Mock getAuthService
vi.mock('@/lib/auth', () => ({
  getAuthService: vi.fn(),
}))

// Mock DefaultOriginResolver from '../actions/auth-helpers' to return a fixed origin
vi.mock('../actions/auth-helpers', async (importOriginal) => {
  const original = await importOriginal<typeof import('../actions/auth-helpers')>()
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
})
