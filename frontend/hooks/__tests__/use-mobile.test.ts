import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '../use-mobile'

describe('useIsMobile', () => {
  const originalMatchMedia = window.matchMedia
  const originalInnerWidth = window.innerWidth
  let changeCallback: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    changeCallback = () => {}
    
    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn().mockImplementation((event, callback) => {
        if (event === 'change') {
          changeCallback = callback
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    window.innerWidth = originalInnerWidth
  })

  it('returns false when window width is greater than breakpoint', () => {
    window.innerWidth = 1024
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true when window width is smaller than breakpoint', () => {
    window.innerWidth = 500
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('updates state when media query change event fires', () => {
    window.innerWidth = 1024
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // Simulate window resizing to small screen size
    window.innerWidth = 320
    act(() => {
      changeCallback()
    })

    expect(result.current).toBe(true)
  })
})
