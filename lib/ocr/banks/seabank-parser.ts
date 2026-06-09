import { OCRResult, BankTransaction } from '../types'
import { IBankParser } from '../interfaces'
import {
  parseStatementPeriod,
  formatISO8601Date,
  classifyCategory,
  sanitizeTransactionName,
  sliceColumns,
  normalizeOcrDigit,
  splitIntoPages,
  splitIntoLines,
  buildBankResult,
} from '../utils'
import { STATEMENT_TIME_REGEX } from '@/lib/constants/ocr'

interface ColumnHeaders {
  dateIdx: number
  transIdx: number
  keluarIdx: number
  masukIdx: number
  balanceIdx: number
}

interface PageDate {
  day: string
  month: string
  year: string
  raw: string
}

export class SeabankParser implements IBankParser {
  bankName = 'SeaBank'

  identify(text: string): boolean {
    const lower = text.toLowerCase()
    // Require SeaBank-specific header context, not just any mention in transaction descriptions
    return (
      lower.includes('pt bank seabank') ||
      lower.includes('seabank indonesia') ||
      (lower.includes('seabank') && (lower.includes('laporan rekening seabank') || lower.includes('saldo seabank')))
    )
  }

  parse(text: string, timezoneOffset?: string): OCRResult {
    const statementPeriod = parseStatementPeriod(text)
    const saldoAwal = this.parseSaldoAwal(text)
    const saldoAkhir = this.parseSaldoAkhir(text)
    const pages = splitIntoPages(text)
    const allItems: BankTransaction[] = []
    let lastBalance: number | null = null

    for (const page of pages) {
      const result = this.parsePage(page, statementPeriod, saldoAwal, lastBalance, timezoneOffset)
      allItems.push(...result.items)
      lastBalance = result.lastBalance
    }

    return buildBankResult(allItems, this.bankName, statementPeriod, saldoAwal, saldoAkhir)
  }

  private parsePage(
    page: string,
    statementPeriod: string,
    saldoAwal: number,
    lastBalance: number | null,
    timezoneOffset?: string,
  ): { items: BankTransaction[]; lastBalance: number | null } {
    const lines = splitIntoLines(page)
    const headers = this.findColumnHeaders(lines)

    if (headers.dateIdx === -1 || headers.transIdx === -1) {
      return { items: [], lastBalance }
    }

    const columns = sliceColumns(lines, [
      { label: 'date', idx: headers.dateIdx },
      { label: 'trans', idx: headers.transIdx },
      { label: 'keluar', idx: headers.keluarIdx },
      { label: 'masuk', idx: headers.masukIdx },
      { label: 'balance', idx: headers.balanceIdx },
    ])

    const pageDates = this.parseDatesFromColumn(columns.date, statementPeriod)
    const pageDescs = this.parseDescriptionsFromColumn(columns.trans)
    const pageBalances = this.parseBalancesFromColumn(columns.balance)
    const masukValues = this.parseNumericColumn(columns.masuk)
    const keluarValues = this.parseNumericColumn(columns.keluar)

    const items: BankTransaction[] = []
    let currentLastBalance = lastBalance

    const minLen = Math.min(pageDates.length, pageDescs.length, pageBalances.length)
    for (let i = 0; i < minLen; i++) {
      const transaction = this.buildTransaction(
        pageDates[i], pageDescs[i], pageBalances[i],
        i, pageBalances, currentLastBalance, saldoAwal,
        masukValues, keluarValues, timezoneOffset,
      )
      items.push(transaction)
      currentLastBalance = pageBalances[i]
    }

    return { items, lastBalance: currentLastBalance }
  }

  private parseSaldoAwal(text: string): number {
    const match = text.match(/saldo awal\s*(?:\(idr\))?\s*([\d.]+)/i)
    if (!match) return 0
    return parseInt(match[1].replace(/\./g, ''), 10) || 0
  }

  private parseSaldoAkhir(text: string): number {
    const match = text.match(/saldo akhir\s*(?:\(idr\))?\s*([\d.]+)/i)
    if (!match) return 0
    return parseInt(match[1].replace(/\./g, ''), 10) || 0
  }

  private findColumnHeaders(lines: string[]): ColumnHeaders {
    const headers: ColumnHeaders = { dateIdx: -1, transIdx: -1, keluarIdx: -1, masukIdx: -1, balanceIdx: -1 }

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase()
      if (lower.startsWith('tanggal')) headers.dateIdx = i
      else if (lower.startsWith('transaksi')) headers.transIdx = i
      else if (lower.includes('keluar')) headers.keluarIdx = i
      else if (lower.includes('masuk')) headers.masukIdx = i
      else if (lower.includes('saldo akhir')) headers.balanceIdx = i
    }

    return headers
  }

  private parseDatesFromColumn(lines: string[] | undefined, statementPeriod: string): PageDate[] {
    if (!lines) return []

    const dates: PageDate[] = []
    let currentMonthYear = ''

    for (const line of lines) {
      const lineLower = line.toLowerCase().trim()

      if (this.isSkippableLine(lineLower)) continue

      if (/^[a-zA-Z]{3,12}\s+\d{4}$/.test(line)) {
        currentMonthYear = line
        continue
      }

      const date = this.extractDateFromLine(line, lineLower, currentMonthYear, statementPeriod)
      if (date) dates.push(date)
    }

    return dates
  }

  private isSkippableLine(lineLower: string): boolean {
    return (
      lineLower.includes('halaman') ||
      lineLower.includes('seabank') ||
      lineLower.includes('sampai') ||
      lineLower.includes('s/d') ||
      lineLower.includes('periode') ||
      lineLower.includes('ringkasan')
    )
  }

  private extractDateFromLine(
    line: string,
    lineLower: string,
    currentMonthYear: string,
    statementPeriod: string,
  ): PageDate | null {
    const monthMatch = lineLower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|des|mei|agu|okt)\b/)
    if (!monthMatch) return null

    const month = monthMatch[1]
    const beforeMonth = lineLower.substring(0, monthMatch.index).trim()
    const dayDigits = normalizeOcrDigit(beforeMonth).replace(/\D/g, '')

    if (dayDigits.length === 0 || dayDigits.length > 2) return null

    const yearStr = this.resolveYear(line, currentMonthYear, statementPeriod)

    return {
      day: dayDigits.padStart(2, '0'),
      month,
      year: yearStr,
      raw: line,
    }
  }

  private resolveYear(line: string, currentMonthYear: string, statementPeriod: string): string {
    const yearMatch = line.match(/\b(202\d)\b/)
    if (yearMatch) return yearMatch[1]

    if (currentMonthYear) {
      const myMatch = currentMonthYear.match(/\b(202\d)\b/)
      if (myMatch) return myMatch[1]
    }

    if (statementPeriod) {
      const periodMatch = statementPeriod.match(/\b(202\d)\b/)
      if (periodMatch) return periodMatch[1]
    }

    return '2026'
  }

  private parseDescriptionsFromColumn(lines: string[] | undefined): string[] {
    if (!lines) return []

    const descs: string[] = []
    let currentDesc = ''
    const endKeywords = ['transfer', 'pembayaran', 'pernbayara n', 'pembayara n', 'pernbayaran', 'bunga tabungan', 'biaya', 'cashback', 'qris']

    for (const line of lines) {
      const lineLower = line.toLowerCase().trim()
      if (lineLower.length === 0) continue

      currentDesc = currentDesc ? `${currentDesc} ${line}` : line

      if (endKeywords.some(kw => lineLower.includes(kw))) {
        descs.push(currentDesc)
        currentDesc = ''
      }
    }

    if (currentDesc) descs.push(currentDesc)

    return descs
  }

  private parseBalancesFromColumn(lines: string[] | undefined): number[] {
    if (!lines) return []

    return lines
      .map(line => parseInt(line.replace(/\./g, '').replace(/,/g, ''), 10))
      .filter(val => !isNaN(val) && val > 100)
  }

  private parseNumericColumn(lines: string[] | undefined): number[] {
    if (!lines) return []

    return lines
      .map(line => parseInt(line.replace(/\./g, '').replace(/,/g, ''), 10))
      .filter(val => !isNaN(val))
  }

  private buildTransaction(
    date: PageDate,
    desc: string,
    currentBalance: number,
    index: number,
    pageBalances: number[],
    lastBalance: number | null,
    saldoAwal: number,
    masukValues: number[],
    keluarValues: number[],
    timezoneOffset?: string,
  ): BankTransaction {
    const { amount, type } = this.resolveAmountType(
      index, currentBalance, pageBalances, lastBalance, saldoAwal,
      masukValues, keluarValues,
    )

    const timeMatch = date.raw.match(STATEMENT_TIME_REGEX)
    const timeStr = timeMatch ? timeMatch[0] : undefined

    const formattedDate = formatISO8601Date(date.day, date.month, date.year, timeStr, timezoneOffset)
    const name = sanitizeTransactionName(desc)
    const category = classifyCategory(name)

    return { date: formattedDate, name, amount, type, category, bank: this.bankName }
  }

  private resolveAmountType(
    index: number,
    currentBalance: number,
    pageBalances: number[],
    lastBalance: number | null,
    saldoAwal: number,
    masukValues: number[],
    keluarValues: number[],
  ): { amount: number; type: 'income' | 'expense' } {
    if (index > 0) {
      const diff = currentBalance - pageBalances[index - 1]
      return { amount: Math.abs(diff), type: diff >= 0 ? 'income' : 'expense' }
    }

    if (lastBalance !== null) {
      const diff = currentBalance - lastBalance
      return { amount: Math.abs(diff), type: diff >= 0 ? 'income' : 'expense' }
    }

    const diff = currentBalance - saldoAwal
    const type = this.determineFirstTransactionType(currentBalance, masukValues, keluarValues)
    return { amount: Math.abs(diff), type }
  }

  private determineFirstTransactionType(
    currentBalance: number,
    masukValues: number[],
    keluarValues: number[],
  ): 'income' | 'expense' {
    if (masukValues.includes(currentBalance)) return 'income'
    if (keluarValues.includes(currentBalance)) return 'expense'
    return currentBalance >= 0 ? 'income' : 'expense'
  }
}
