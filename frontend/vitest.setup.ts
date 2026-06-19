import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { createElement } from 'react'

// Suppress console logs in tests by default, unless VERBOSE_TESTS is set
if (!process.env.VERBOSE_TESTS) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
}

// Mock window.alert to suppress jsdom warnings
global.alert = vi.fn()

function createMockSupabaseClient() {
  const self = {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://github.com/oauth' }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: vi.fn(),
      upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://mock-url' }, error: null }),
    },
  }

  self.from.mockReturnValue(self)
  self.select.mockReturnValue(self)
  self.insert.mockReturnValue(self)
  self.update.mockReturnValue(self)
  self.delete.mockReturnValue(self)
  self.eq.mockReturnValue(self)
  self.order.mockReturnValue(self)
  self.storage.from.mockReturnValue(self.storage)

  return self
}

const mockSupabaseClient = createMockSupabaseClient()

vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn().mockReturnValue(null),
  })),
  cookies: vi.fn(() => ({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn().mockReturnValue(false),
  })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseClient),
}))

vi.mock('next/link', () => ({
  default: (props: any) => {
    return createElement('a', props)
  },
}))

vi.mock('next/image', () => ({
  default: (props: any) => {
    return createElement('img', { ...props, alt: props.alt || '' })
  },
}))

vi.mock('nuqs', () => ({
  useQueryState(_key: string, options?: any) {
    const val = options?.defaultValue ?? null
    const setVal = vi.fn()
    return [val, setVal]
  },
}))
