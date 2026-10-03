import type { DashboardCashFlowEntry } from '@/lib/repositories/types'

/** Savings-rate target based on the 50/30/20 rule. */
export const SAVINGS_TARGET_PERCENT = 20

const TRANSFER_KEYWORDS = /\b(transfer|trf|pemindahan|pindah\s*dana|kantong|top\s*-?up|flip|bi-?fast|tarik\s*tunai|setor\s*tunai)\b/i

/**
 * Heuristic: an entry is an internal fund movement (not real spending/earning)
 * when its category or description indicates a transfer between own accounts.
 */
export function isFundTransfer(entry: Pick<DashboardCashFlowEntry, 'main_category' | 'description'>): boolean {
  const category = (entry.main_category ?? '').trim()
  if (category) {
    return /transfer/i.test(category)
  }
  return TRANSFER_KEYWORDS.test(entry.description ?? '')
}

export type SavingsStatus = 'healthy' | 'vulnerable' | 'deficit'

export interface DashboardSummary {
  totalIncome: number
  totalExpense: number
  netBalance: number
  realIncome: number
  realExpense: number
  transferIn: number
  transferOut: number
  realNet: number
  savingsRate: number
  status: SavingsStatus
  monthsCount: number
  avgMonthlyRealExpense: number
}

export function summarizeEntries(entries: DashboardCashFlowEntry[]): DashboardSummary {
  let totalIncome = 0
  let totalExpense = 0
  let transferIn = 0
  let transferOut = 0
  const months = new Set<string>()

  for (const e of entries) {
    const income = Number(e.income || 0)
    const expense = Number(e.expense || 0)
    totalIncome += income
    totalExpense += expense
    if (e.date) months.add(e.date.substring(0, 7))
    if (isFundTransfer(e)) {
      transferIn += income
      transferOut += expense
    }
  }

  const realIncome = totalIncome - transferIn
  const realExpense = totalExpense - transferOut
  const realNet = realIncome - realExpense
  const savingsRate = realIncome > 0 ? (realNet / realIncome) * 100 : 0
  const status: SavingsStatus =
    realNet < 0 ? 'deficit' : savingsRate >= SAVINGS_TARGET_PERCENT ? 'healthy' : 'vulnerable'
  const monthsCount = Math.max(months.size, 1)

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    realIncome,
    realExpense,
    transferIn,
    transferOut,
    realNet,
    savingsRate,
    status,
    monthsCount,
    avgMonthlyRealExpense: realExpense / monthsCount,
  }
}

/** Emergency fund range: 6–12 months of average real expenses. */
export function emergencyFundRange(avgMonthlyExpense: number): { min: number; max: number } {
  return { min: Math.round(avgMonthlyExpense * 6), max: Math.round(avgMonthlyExpense * 12) }
}

export interface TrendIndicator {
  percent: number | null
  direction: 'up' | 'down' | 'neutral'
  formatted: string
}

export function calculateTrend(current: number, previous: number): TrendIndicator {
  if (previous === 0 && current === 0) {
    return { percent: 0, direction: 'neutral', formatted: '0%' }
  }
  if (previous === 0) {
    return { percent: 100, direction: current > 0 ? 'up' : 'neutral', formatted: current > 0 ? 'Baru' : '0%' }
  }
  const diff = current - previous
  const percent = Math.round((Math.abs(diff) / Math.abs(previous)) * 100)
  const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'
  return { percent, direction, formatted: `${percent}%` }
}
