import { describe, expect, it } from 'vitest'
import {
  formatStatementPeriodInputDate,
  getPeriodRange,
  normalizeStatementPeriodToDate,
} from '@/lib/utils/statement-period'

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

  it('normalizes Indonesian month labels and slash date inputs to month-start dates', () => {
    expect(normalizeStatementPeriodToDate('Agustus 2021')).toBe('2021-08-01')
    expect(normalizeStatementPeriodToDate('01/08/2021')).toBe('2021-08-01')
    expect(formatStatementPeriodInputDate('Agustus 2021')).toBe('01/08/2021')
    expect(getPeriodRange('01/08/2021')).toEqual({
      startVal: 2021 * 12 + 8,
      endVal: 2021 * 12 + 8,
    })
  })
})
