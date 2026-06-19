import { describe, it, expect } from 'vitest'
import { formatDateForInput } from '../date'

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

import { getBrowserTimezoneOffset } from '../date'

describe('getBrowserTimezoneOffset', () => {
  it('returns timezone offset in +/-HH:MM format', () => {
    const offset = getBrowserTimezoneOffset()
    expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/)
  })
})
