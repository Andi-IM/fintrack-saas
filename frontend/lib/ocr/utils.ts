import { STATEMENT_MONTHS, STATEMENT_MONTH_MAP, STATEMENT_CATEGORY_PATTERNS } from '@/lib/constants/ocr'
import { BankTransaction, OCRResult, ReceiptItem } from './types'

export function cleanAndNormalizeAmount(line: string): string {
  let clean = line.trim()
  
  // Replace letter 'o' or 'O' with '0' if the string is otherwise mostly digits, dots, commas, dashes, or plus signs
  const hasDigitsOrSeparators = /[0-9.,\-+]/.test(clean)
  const lettersCount = (clean.match(/[a-zA-Z]/g) || []).length
  const oCount = (clean.match(/[oO]/g) || []).length
  
  if (oCount > 0 && lettersCount === oCount && (hasDigitsOrSeparators || clean.length <= 6)) {
    clean = clean.replace(/[oO]/g, '0')
  }
  
  // Remove space if it's sandwiched between numbers or punctuation
  clean = clean.replace(/(\d)\s+([.,])\s+(\d)/g, '$1$2$3')
  clean = clean.replace(/(\d)\s+([.,])/g, '$1$2')
  clean = clean.replace(/([.,])\s+(\d)/g, '$1$2')
  
  return clean
}

export function parseStatementPeriod(text: string): string {
  let statementPeriod = 'Unknown Period'
  const lines = text.split('\n')
  for (const line of lines) {
    const lineLower = line.trim().toLowerCase()
    if (lineLower.includes('sampai') || lineLower.includes('s/d') || lineLower.includes(' - ') || lineLower.includes('periode')) {
      for (const m of STATEMENT_MONTHS) {
        if (lineLower.includes(m)) {
          const yearMatch = line.match(/\b(202\d)\b/)
          if (yearMatch) {
            statementPeriod = `${m.toUpperCase()} ${yearMatch[0]}`
            break
          }
        }
      }
    }
    if (statementPeriod !== 'Unknown Period') break
  }

  if (statementPeriod === 'Unknown Period') {
    for (const line of lines) {
      const lineLower = line.trim().toLowerCase()
      if (lineLower.includes('halaman') || lineLower.includes('telepon')) continue
      for (const m of STATEMENT_MONTHS) {
        if (lineLower.includes(m)) {
          const yearMatch = line.match(/\b(202\d)\b/)
          if (yearMatch) {
            statementPeriod = `${m.toUpperCase()} ${yearMatch[0]}`
            break
          }
        }
      }
      if (statementPeriod !== 'Unknown Period') break
    }
  }

  return statementPeriod
}

export function formatTransactionDate(day: string, monthStr: string, year: string): string {
  const cleanDay = day.replace(/\D/g, '').padStart(2, '0')
  const cleanMonthStr = monthStr.toLowerCase().replace(/[^a-z]/g, '').substring(0, 3)
  const month = STATEMENT_MONTH_MAP[cleanMonthStr] || '01'
  const cleanYear = year.replace(/\D/g, '') || new Date().getFullYear().toString()
  return `${cleanYear}-${month}-${cleanDay}`
}

export function formatISO8601Date(day: string, monthStr: string, year: string, timeStr?: string, timezoneOffset = '+07:00'): string {
  const date = formatTransactionDate(day, monthStr, year)
  // Ensure time is HH:MM:SS
  let time = timeStr ? timeStr.trim() : '00:00:00'
  if (time.length === 5) {
    time = `${time}:00`
  }
  return `${date}T${time}${timezoneOffset}`
}

export function classifyCategory(name: string): string {
  const nameLower = name.toLowerCase()
  for (const pattern of STATEMENT_CATEGORY_PATTERNS) {
    if (pattern.regex.test(nameLower)) {
      return pattern.category
    }
  }
  if (/bunga|interest/i.test(nameLower)) {
    return 'Interest'
  }
  return 'Other'
}

export function sanitizeTransactionName(name: string): string {
  let cleanName = name.replace(/\d{9,20}/g, '').replace(/\s+/g, ' ').trim()
  if (cleanName.length < 3) {
    cleanName = 'Transaction'
  }
  return cleanName
}

export function sliceColumns(
  lines: string[],
  headers: { label: string; idx: number }[]
): Record<string, string[]> {
  const sorted = headers
    .filter(h => h.idx !== -1)
    .sort((a, b) => a.idx - b.idx)

  const columns: Record<string, string[]> = {}
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i].idx + 1
    const end = i + 1 < sorted.length ? sorted[i + 1].idx : lines.length
    columns[sorted[i].label] = lines.slice(start, end)
  }
  return columns
}

export function parseIndonesianAmount(line: string): number | null {
  const normalized = cleanAndNormalizeAmount(line)
  const isAmount = /^\d{1,3}(\.\d{3})*(,\d{2})?$/.test(normalized) || 
                   /^\d+,\d{2}$/.test(normalized) || 
                   /^\d+(\.\d{2})?$/.test(normalized) || 
                   /^\d{4,9}$/.test(normalized)
  
  if (!isAmount) return null

  let cleanVal = normalized
  if (normalized.endsWith(',00') || normalized.endsWith('.00')) {
    cleanVal = normalized.substring(0, normalized.length - 3)
  } else if (normalized.includes(',')) {
    cleanVal = normalized.split(',')[0]
  }
  
  const val = parseInt(cleanVal.replace(/\./g, ''), 10)
  return isNaN(val) ? null : val
}

export function normalizeOcrDigit(text: string): string {
  return text
    .replace(/[gG]/g, '9')
    .replace(/[sS]/g, '5')
    .replace(/[liI]/g, '1')
    .replace(/[oO]/g, '0')
}

export function splitIntoPages(text: string): string[] {
  return text.split('---PAGE_BREAK---')
}

export function splitIntoLines(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
}

export function buildBankResult(
  items: BankTransaction[],
  bankName: string,
  statementPeriod: string,
  openingBalance?: number,
  closingBalance?: number
): OCRResult {
  return {
    statementPeriod,
    items,
    totalItems: items.length,
    bank: bankName,
    openingBalance,
    closingBalance
  }
}

export function extractReceiptDate(text: string, lines: string[], timezoneOffset?: string): string {
  const dateRegex = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/
  const dateMatch = text.match(dateRegex)
  const timeRegex = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/
  const timeMatch = text.match(timeRegex)

  if (dateMatch) {
    let day = parseInt(dateMatch[1], 10)
    let month = parseInt(dateMatch[2], 10)
    let year = parseInt(dateMatch[3], 10)
    if (year < 100) year += 2000

    if (month > 12 && day <= 12) {
      const temp = day
      day = month
      month = temp
    }

    let hour = 12, minute = 0, second = 0
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10)
      minute = parseInt(timeMatch[2], 10)
      if (timeMatch[3]) second = parseInt(timeMatch[3], 10)
    }

    try {
      const parsedDate = new Date(year, month - 1, day, hour, minute, second)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString()
      }
    } catch (e) {
      console.error('Error parsing date:', e)
    }
  }

  return new Date().toISOString()
}

export function extractReceiptMerchant(lines: string[]): string {
  return lines[0] || 'Unknown Merchant'
}

export function buildReceiptResult(
  merchant: string,
  items: ReceiptItem[],
  total: number,
  category: string,
  date: string,
  options: {
    address?: string
    paymentMethod?: string
    amountPaid?: number
    change?: number
    type?: 'shopping' | 'atm'
    atmId?: string
    transactionType?: 'withdrawal' | 'deposit' | 'transfer'
    fee?: number
  } = {}
): OCRResult {
  return {
    merchant,
    items,
    total,
    category,
    date,
    address: options.address,
    paymentMethod: options.paymentMethod,
    amountPaid: options.amountPaid,
    change: options.change,
    type: options.type || 'shopping',
    atmId: options.atmId,
    transactionType: options.transactionType,
    fee: options.fee,
  }
}
