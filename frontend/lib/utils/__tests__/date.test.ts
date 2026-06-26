import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatDateForInput, getBrowserTimezoneOffset } from '@/lib/utils/date'

describe('formatDateForInput', () => {
  it('formats a valid ISO string to datetime-local format', () => {
    expect(formatDateForInput('2026-06-19T10:30:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('returns the original string when input is not a valid date', () => {
    expect(formatDateForInput('not-a-date')).toBe('not-a-date')
  })

  it('returns the original string for empty string', () => {
    expect(formatDateForInput('')).toBe('')
  })

  it('pads single-digit month, day, hour, and minute', () => {
    // 2026-01-05T09:03 — all fields need padding
    const result = formatDateForInput('2026-01-05T09:03:00Z')
    expect(result).toMatch(/^2026-01-05T/)
    expect(result).toMatch(/:\d{2}$/)
  })
})

describe('getBrowserTimezoneOffset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns timezone offset in +HH:MM format for negative offset minutes (ahead of UTC)', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-420) // UTC+7
    const offset = getBrowserTimezoneOffset()
    expect(offset).toBe('+07:00')
  })

  it('returns timezone offset in -HH:MM format for positive offset minutes (behind UTC)', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(300) // UTC-5
    const offset = getBrowserTimezoneOffset()
    expect(offset).toBe('-05:00')
  })

  it('pads single-digit hours and minutes', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(61) // 1h 1m behind UTC
    const offset = getBrowserTimezoneOffset()
    expect(offset).toBe('-01:01')
  })
})
