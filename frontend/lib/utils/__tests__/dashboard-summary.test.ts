import { describe, it, expect } from 'vitest'
import { summarizeEntries, isFundTransfer, emergencyFundRange, calculateTrend } from '@/lib/utils/dashboard-summary'
import type { DashboardCashFlowEntry } from '@/lib/repositories/types'

const entry = (p: Partial<DashboardCashFlowEntry>): DashboardCashFlowEntry => ({
  id: 'x',
  date: '2026-10-01',
  main_category: null,
  description: null,
  income: 0,
  expense: 0,
  payment_method: null,
  ...p,
}) as DashboardCashFlowEntry

describe('dashboard-summary', () => {
  it('detects fund transfers', () => {
    expect(isFundTransfer(entry({ description: 'Transfer ke Kantong' }))).toBe(true)
    expect(isFundTransfer(entry({ main_category: 'Transfer', description: 'TRF Ke-ANDI' }))).toBe(true)
    expect(isFundTransfer(entry({ description: 'Makan siang' }))).toBe(false)
    // Explicit non-transfer category takes precedence over transfer keyword in description
    expect(isFundTransfer(entry({ main_category: 'Kebutuhan (Needs)', description: 'Beli tas - Transfer ke MUDIKNO' }))).toBe(false)
  })

  it('separates real expense from transfers and flags deficit', () => {
    const s = summarizeEntries([
      entry({ income: 1000 }),
      entry({ expense: 800, description: 'Belanja' }),
      entry({ expense: 500, description: 'Pemindahan dana' }),
    ])
    expect(s.realExpense).toBe(800)
    expect(s.transferOut).toBe(500)
    expect(s.netBalance).toBe(-300)
    expect(s.realNet).toBe(200)
    expect(s.status).toBe('healthy')
  })

  it('marks deficit and healthy states', () => {
    expect(summarizeEntries([entry({ income: 100, expense: 150 })]).status).toBe('deficit')
    expect(summarizeEntries([entry({ income: 100, expense: 50 })]).status).toBe('healthy')
  })

  it('computes emergency fund range', () => {
    expect(emergencyFundRange(1000)).toEqual({ min: 6000, max: 12000 })
  })

  it('calculates trend comparisons accurately', () => {
    // Expense increase: 100 -> 112 (+12%)
    expect(calculateTrend(112, 100)).toEqual({ percent: 12, direction: 'up', formatted: '12%' })
    // Expense decrease: 100 -> 80 (-20%)
    expect(calculateTrend(80, 100)).toEqual({ percent: 20, direction: 'down', formatted: '20%' })
    // Neutral / unchanged
    expect(calculateTrend(100, 100)).toEqual({ percent: 0, direction: 'neutral', formatted: '0%' })
    // Zero baseline to positive
    expect(calculateTrend(500, 0)).toEqual({ percent: 100, direction: 'up', formatted: 'Baru' })
    // Both zero
    expect(calculateTrend(0, 0)).toEqual({ percent: 0, direction: 'neutral', formatted: '0%' })
  })
})
