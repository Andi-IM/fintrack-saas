import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock next/navigation
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
}))

// Mock nuqs (query state)
vi.mock('nuqs', () => ({
  useQueryState(key: string, options?: any) {
    const val = options?.defaultValue ?? null
    const setVal = vi.fn()
    return [val, setVal]
  },
}))
