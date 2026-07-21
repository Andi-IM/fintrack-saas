import { describe, expect, it } from 'vitest'
import { getPeriodRange, normalizeStatementPeriodToDate } from '@/lib/utils/statement-period'

describe('statement period utils', () => {
  it('accepts forward statement ranges', () => {
    expect(getPeriodRange('May 2026 - Jul 2026')).toEqual({
      startVal: 2026 * 12 + 5,
      endVal: 2026 * 12 + 7,
    })
    expect(normalizeStatementPeriodToDate('May 2026 - Jul 2026')).toBe('2026-07-01')
  })

  it('accepts equal statement ranges', () => {
    expect(getPeriodRange('Jul 2026 - Jul 2026')).toEqual({
      startVal: 2026 * 12 + 7,
      endVal: 2026 * 12 + 7,
    })
    expect(normalizeStatementPeriodToDate('Jul 2026 - Jul 2026')).toBe('2026-07-01')
  })

  it('rejects reversed statement ranges', () => {
    expect(getPeriodRange('Jul 2026 - May 2026')).toBeNull()
    expect(normalizeStatementPeriodToDate('Jul 2026 - May 2026')).toBeNull()
  })
})
