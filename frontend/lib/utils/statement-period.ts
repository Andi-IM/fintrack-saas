import { STATEMENT_MONTH_MAP } from '@/lib/constants/ocr'

const MONTH_LABELS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const

export interface StatementPeriodRange {
  startVal: number
  endVal: number
}

interface MonthYear {
  year: number
  month: number
}

function toPeriodValue({ year, month }: MonthYear): number {
  return year * 12 + month
}

function isForwardRange(start: MonthYear, end: MonthYear): boolean {
  return toPeriodValue(end) >= toPeriodValue(start)
}

function toPeriodDate({ year, month }: MonthYear): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function parseMonthYear(monthStr: string, yearStr: string): MonthYear | null {
  const cleanMonth = monthStr.toLowerCase().substring(0, 3)
  const month = Number.parseInt(STATEMENT_MONTH_MAP[cleanMonth] || '', 10)
  const year = Number.parseInt(yearStr, 10)

  if (!month || month < 1 || month > 12 || !year) return null
  return { month, year }
}

export function getPeriodRange(period: string | null | undefined): StatementPeriodRange | null {
  if (!period) return null

  const isoDate = period.match(/^(\d{4})-(\d{2})-\d{2}$/)
  if (isoDate) {
    const year = Number.parseInt(isoDate[1], 10)
    const month = Number.parseInt(isoDate[2], 10)
    if (month >= 1 && month <= 12) {
      const val = toPeriodValue({ year, month })
      return { startVal: val, endVal: val }
    }
  }

  const rangeRegex = /\b([a-zA-Z]{3,9})\s+(\d{4})\s*-\s*([a-zA-Z]{3,9})\s+(\d{4})\b/i
  const matchRange = period.match(rangeRegex)
  if (matchRange) {
    const start = parseMonthYear(matchRange[1], matchRange[2])
    const end = parseMonthYear(matchRange[3], matchRange[4])
    if (!start || !end) return null
    if (!isForwardRange(start, end)) return null
    return {
      startVal: toPeriodValue(start),
      endVal: toPeriodValue(end),
    }
  }

  const singleRegex = /\b([a-zA-Z]{3,9})\s+(\d{4})\b/i
  const matchSingle = period.match(singleRegex)
  if (matchSingle) {
    const single = parseMonthYear(matchSingle[1], matchSingle[2])
    if (!single) return null
    const val = toPeriodValue(single)
    return { startVal: val, endVal: val }
  }

  return null
}

export function normalizeStatementPeriodToDate(period: string): string | null {
  const isoDate = period.match(/^(\d{4})-(\d{2})-\d{2}$/)
  if (isoDate) {
    const year = Number.parseInt(isoDate[1], 10)
    const month = Number.parseInt(isoDate[2], 10)
    if (month >= 1 && month <= 12) return toPeriodDate({ year, month })
    return null
  }

  const rangeRegex = /\b([a-zA-Z]{3,9})\s+(\d{4})\s*-\s*([a-zA-Z]{3,9})\s+(\d{4})\b/i
  const matchRange = period.match(rangeRegex)
  if (matchRange) {
    const start = parseMonthYear(matchRange[1], matchRange[2])
    const end = parseMonthYear(matchRange[3], matchRange[4])
    if (!start || !end) return null
    if (!isForwardRange(start, end)) return null
    return toPeriodDate(end)
  }

  const singleRegex = /\b([a-zA-Z]{3,9})\s+(\d{4})\b/i
  const matchSingle = period.match(singleRegex)
  if (matchSingle) {
    const single = parseMonthYear(matchSingle[1], matchSingle[2])
    return single ? toPeriodDate(single) : null
  }

  return null
}

export function formatStatementPeriodLabel(period: string | null | undefined): string {
  if (!period) return '-'

  const isoDate = period.match(/^(\d{4})-(\d{2})-\d{2}$/)
  if (isoDate) {
    const year = Number.parseInt(isoDate[1], 10)
    const month = Number.parseInt(isoDate[2], 10)
    if (month >= 1 && month <= 12) return `${MONTH_LABELS[month - 1]} ${year}`
  }

  return period
}
