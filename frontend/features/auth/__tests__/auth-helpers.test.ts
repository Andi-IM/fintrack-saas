import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DefaultOriginResolver, resolveAuthOrigin } from '@/features/auth/actions/auth-helpers'
import { headers } from 'next/headers'

// Mock next/headers
vi.mock('next/headers', async (importOriginal) => {
  const original = await importOriginal<typeof import('next/headers')>()
  return {
    ...original,
    headers: vi.fn(),
  }
})

describe('DefaultOriginResolver', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    vi.clearAllMocks()
    originalEnv = { ...process.env }
    // Clean environment variables for tests
    delete process.env.APP_URL
    delete process.env.NEXT_PUBLIC_VERCEL_URL
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return APP_URL if specified', async () => {
    process.env.APP_URL = 'https://custom-app.com'
    const resolver = new DefaultOriginResolver()
    const result = await resolver.resolve()
    expect(result).toBe('https://custom-app.com')
  })

  it('should return Vercel URL if NEXT_PUBLIC_VERCEL_URL is specified and APP_URL is not', async () => {
    process.env.NEXT_PUBLIC_VERCEL_URL = 'my-vercel-deployment.vercel.app'
    const resolver = new DefaultOriginResolver()
    const result = await resolver.resolve()
    expect(result).toBe('https://my-vercel-deployment.vercel.app')
  })

  it('should resolve origin from x-forwarded-host if env variables are not defined', async () => {
    const mockHeaders = {
      get: vi.fn((key: string) => {
        if (key === 'x-forwarded-host') return 'proxy-host.com'
        if (key === 'x-forwarded-proto') return 'https'
        return null
      }),
    }
    vi.mocked(headers).mockResolvedValue(mockHeaders as any)

    const resolver = new DefaultOriginResolver()
    const result = await resolver.resolve()
    expect(result).toBe('https://proxy-host.com')
  })

  it('should resolve origin from host if x-forwarded-host is missing', async () => {
    const mockHeaders = {
      get: vi.fn((key: string) => {
        if (key === 'host') return 'my-host.com'
        if (key === 'x-forwarded-proto') return 'http'
        return null
      }),
    }
    vi.mocked(headers).mockResolvedValue(mockHeaders as any)

    const resolver = new DefaultOriginResolver()
    const result = await resolver.resolve()
    expect(result).toBe('http://my-host.com')
  })

  it('should default to localhost:3000 and http if no host headers are present', async () => {
    const mockHeaders = {
      get: vi.fn(() => null),
    }
    vi.mocked(headers).mockResolvedValue(mockHeaders as any)

    const resolver = new DefaultOriginResolver()
    const result = await resolver.resolve()
    expect(result).toBe('http://localhost:3000')
  })

  it('should resolve with https if host is remote and proto is missing', async () => {
    const mockHeaders = {
      get: vi.fn((key: string) => {
        if (key === 'host') return 'production-site.com'
        return null
      }),
    }
    vi.mocked(headers).mockResolvedValue(mockHeaders as any)

    const resolver = new DefaultOriginResolver()
    const result = await resolver.resolve()
    expect(result).toBe('https://production-site.com')
  })
})

describe('resolveAuthOrigin', () => {
  it('should instantiate DefaultOriginResolver and resolve', async () => {
    process.env.APP_URL = 'https://app-url-from-wrapper.com'
    const result = await resolveAuthOrigin()
    expect(result).toBe('https://app-url-from-wrapper.com')
  })
})
