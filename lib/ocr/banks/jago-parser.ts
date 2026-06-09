import { OCRResult, BankTransaction } from '../types'
import { IBankParser } from '../interfaces'
import {
  parseStatementPeriod,
  formatISO8601Date,
  classifyCategory,
  sanitizeTransactionName,
  sliceColumns,
  splitIntoPages,
  splitIntoLines,
  buildBankResult,
} from '../utils'
import { STATEMENT_TIME_REGEX } from '@/lib/constants/ocr'

interface ColumnHeaders {
  dateIdx: number
  sourceIdx: number
  descIdx: number
  amountIdx: number
  balanceIdx: number
}

export class JagoParser implements IBankParser {
  bankName = 'Bank JAGO'

  identify(text: string): boolean {
    return text.toLowerCase().includes('jago')
  }

  parse(text: string, timezoneOffset?: string): OCRResult {
    const statementPeriod = parseStatementPeriod(text)
    const saldoAwal = this.parseSaldoAwal(text)
    const saldoAkhir = this.parseSaldoAkhir(text)
    const pages = splitIntoPages(text)
    const allItems: BankTransaction[] = []

    for (const page of pages) {
      const items = this.parsePage(page, timezoneOffset)
      allItems.push(...items)
    }

    return buildBankResult(allItems, this.bankName, statementPeriod, saldoAwal, saldoAkhir)
  }

  private parseSaldoAwal(text: string): number {
    const match = text.match(/saldo awal\s*(?::|rp)?\s*([\d,.]+)/i)
    if (!match) return 0
    let clean = match[1].replace(/,00/g, '').replace(/\./g, '').replace(/,/g, '')
    return parseInt(clean, 10) || 0
  }

  private parseSaldoAkhir(text: string): number {
    const match = text.match(/saldo akhir\s*(?::|rp)?\s*([\d,.]+)/i)
    if (!match) return 0
    let clean = match[1].replace(/,00/g, '').replace(/\./g, '').replace(/,/g, '')
    return parseInt(clean, 10) || 0
  }

  private parsePage(page: string, timezoneOffset?: string): BankTransaction[] {
    const lines = splitIntoLines(page)
    const headers = this.findColumnHeaders(lines)

    if (headers.dateIdx === -1 || headers.amountIdx === -1) return []

    const columns = sliceColumns(lines, [
      { label: 'date', idx: headers.dateIdx },
      { label: 'source', idx: headers.sourceIdx },
      { label: 'desc', idx: headers.descIdx },
      { label: 'amount', idx: headers.amountIdx },
      { label: 'balance', idx: headers.balanceIdx },
    ])

    const pageDates = this.parseDatesFromColumn(columns.date)
    const pageAmounts = this.parseAmountsFromColumn(columns.amount)
    const descriptions = this.parseDescriptionsFromColumn(columns.source)

    const items: BankTransaction[] = []
    const minLength = Math.min(pageDates.length, pageAmounts.length)

    for (let i = 0; i < minLength; i++) {
      const transaction = this.buildTransaction(
        pageDates[i], pageAmounts[i], descriptions[i], timezoneOffset
      )
      items.push(transaction)
    }

    return items
  }

  private findColumnHeaders(lines: string[]): ColumnHeaders {
    const headers: ColumnHeaders = {
      dateIdx: -1, sourceIdx: -1, descIdx: -1, amountIdx: -1, balanceIdx: -1,
    }

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase()
      if (lower.includes('tanggal & waktu')) headers.dateIdx = i
      else if (lower.includes('sumber/tujuan')) headers.sourceIdx = i
      else if (lower.includes('rincian transaksi')) headers.descIdx = i
      else if (lower.includes('jumlah')) headers.amountIdx = i
      else if (lower.includes('saldo')) headers.balanceIdx = i
    }

    return headers
  }

  private parseDatesFromColumn(lines: string[] | undefined): string[] {
    if (!lines) return []

    const dates: string[] = []
    const dateRegex = /\b(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})\b/
    let currentMonthYear = ''

    for (const line of lines) {
      if (/^[a-zA-Z]{3,12}\s+\d{4}$/.test(line)) {
        currentMonthYear = line
        continue
      }

      const match = line.match(dateRegex)
      if (match) {
        dates.push(line)
      } else {
        const dayMonthMatch = line.match(/\b(\d{1,2})\s+([a-zA-Z]{3,9})\b/)
        if (dayMonthMatch) {
          const yearMatch = currentMonthYear.match(/\b(202\d)\b/)
          const yearStr = yearMatch ? yearMatch[0] : '2024'
          dates.push(`${line} ${yearStr}`)
        }
      }
    }

    return dates
  }

  private parseAmountsFromColumn(lines: string[] | undefined): { value: number; type: 'income' | 'expense' }[] {
    if (!lines) return []

    const amounts: { value: number; type: 'income' | 'expense' }[] = []

    for (const line of lines) {
      const cleanLine = line.replace(/,oo/gi, '').replace(/,00/gi, '')
      const isAmountLine = /^[-+]?\d{1,3}(\.\d{3})*(,\d{2})?$/.test(cleanLine) || /^[-+]?\d+$/.test(cleanLine)

      if (!isAmountLine) continue

      let cleanVal = cleanLine
      if (cleanLine.includes(',')) cleanVal = cleanLine.split(',')[0]
      cleanVal = cleanVal.replace(/\./g, '').replace(/,/g, '')

      const val = parseInt(cleanVal, 10)
      if (isNaN(val)) continue

      amounts.push({
        value: Math.abs(val),
        type: line.startsWith('+') ? 'income' : 'expense',
      })
    }

    return amounts
  }

  private parseDescriptionsFromColumn(lines: string[] | undefined): string[] {
    if (!lines) return []

    const descriptions: string[] = []
    let currentSource = ''

    for (const line of lines) {
      const isNewItem = /^[A-Z]/.test(line) && !/^[A-Z]+$/.test(line)

      if (isNewItem && currentSource.length > 0) {
        descriptions.push(currentSource)
        currentSource = line
      } else {
        currentSource = currentSource ? `${currentSource} ${line}` : line
      }
    }

    if (currentSource) descriptions.push(currentSource)

    return descriptions
  }

  private buildTransaction(
    dateStr: string,
    amountObj: { value: number; type: 'income' | 'expense' },
    rawDescription: string | undefined,
    timezoneOffset?: string,
  ): BankTransaction {
    const name = sanitizeTransactionName(rawDescription || 'Transaction details')

    const formattedDate = this.formatDate(dateStr, timezoneOffset)
    const category = classifyCategory(name)

    return { date: formattedDate, name, amount: amountObj.value, type: amountObj.type, category, bank: this.bankName }
  }

  private formatDate(dateStr: string, timezoneOffset?: string): string {
    const parts = dateStr.split(/\s+/)
    if (parts.length < 2) return new Date().toISOString()

    const day = parts[0]
    const monthStr = parts[1]
    const year = parts.length >= 3 && /^\d{4}$/.test(parts[2]) ? parts[2] : '2024'
    
    // Try to find time in parts
    let timeStr: string | undefined
    for (const part of parts) {
      if (STATEMENT_TIME_REGEX.test(part)) {
        timeStr = part
        break
      }
    }

    return formatISO8601Date(day, monthStr, year, timeStr, timezoneOffset)
  }
}
