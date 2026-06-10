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
    return (
      lower.includes('pt bank seabank') ||
      lower.includes('seabank indonesia') ||
      lower.includes('cs@seabank.co.id') ||
      (lower.includes('seabank') && (
        lower.includes('rekening koran') || 
        lower.includes('ringkasan rekening') || 
        lower.includes('no. rekening seabank') ||
        /s\/n\s+s01-/i.test(lower)
      ))
    )
  }

  parse(text: string, timezoneOffset?: string): OCRResult {
    const statementPeriod = parseStatementPeriod(text)
    let saldoAwal = this.parseSaldoAwal(text)
    let saldoAkhir = this.parseSaldoAkhir(text)
    const pages = splitIntoPages(text)
    const allItems: BankTransaction[] = []

    let currentBalance = saldoAwal
    for (const page of pages) {
      const isTable = page.includes('|---|') || (page.includes('|') && page.toLowerCase().includes('tanggal'))
      if (isTable) {
        const lines = splitIntoLines(page)
        const result = this.parseMarkdownTable(lines, statementPeriod, currentBalance, timezoneOffset)
        if (result.items.length > 0) {
          allItems.push(...result.items)
        }
        if (result.lastBalance !== null) {
          currentBalance = result.lastBalance
        }
      } else {
        const result = this.parsePlainTextPage(page, statementPeriod, currentBalance, timezoneOffset)
        if (result.items.length > 0) {
          allItems.push(...result.items)
        }
        if (result.lastBalance !== null) {
          currentBalance = result.lastBalance
        }
      }
    }

    // Dynamic Starting & Ending Balance Calculation
    const totalIncome = allItems.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const totalExpense = allItems.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)

    if (saldoAwal === 0 && saldoAkhir > 0) {
      saldoAwal = Math.max(0, saldoAkhir - totalIncome + totalExpense)
    } else if (saldoAkhir === 0 && saldoAwal >= 0) {
      saldoAkhir = Math.max(0, saldoAwal + totalIncome - totalExpense)
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
    if (match) {
      const val = parseInt(match[1].replace(/\./g, ''), 10)
      if (val > 100) return val
    }
    const ringkasan = this.parseRingkasanBalances(text)
    if (ringkasan.saldoAwal > 100) return ringkasan.saldoAwal
    return 0
  }

  private parseSaldoAkhir(text: string): number {
    const match = text.match(/saldo akhir\s*(?:\(idr\))?\s*([\d.]+)/i)
    if (match) {
      const val = parseInt(match[1].replace(/\./g, ''), 10)
      if (val > 100) return val
    }
    const matchTotal = text.match(/total:\s*([\d.]+)/i)
    if (matchTotal) {
      const val = parseInt(matchTotal[1].replace(/\./g, ''), 10)
      if (val > 100) return val
    }
    const ringkasan = this.parseRingkasanBalances(text)
    if (ringkasan.saldoAkhir > 100) return ringkasan.saldoAkhir
    return 0
  }

  private parseRingkasanBalances(text: string): { saldoAwal: number; saldoAkhir: number } {
    const lower = text.toLowerCase()
    const startIdx = lower.indexOf('ringkasan rekening')
    if (startIdx === -1) return { saldoAwal: 0, saldoAkhir: 0 }
    
    let endIdx = lower.indexOf('rincian transaksi', startIdx)
    if (endIdx === -1) {
      endIdx = lower.indexOf('halaman 1', startIdx)
    }
    if (endIdx === -1) {
      endIdx = startIdx + 1000
    }
    
    const block = text.substring(startIdx, endIdx)
    const lines = splitIntoLines(block)
    const numbers: number[] = []
    
    for (const line of lines) {
      const cleanLine = line.replace(/\s+/g, '')
      const match = cleanLine.match(/^[rp|idr]*([\d.]+)(?:[rp|idr]*)?$/i)
      if (match) {
        const val = parseInt(match[1].replace(/\./g, ''), 10)
        if (!isNaN(val)) {
          numbers.push(val)
        }
      }
    }
    
    if (numbers.length >= 4) {
      return {
        saldoAwal: numbers[0],
        saldoAkhir: numbers[numbers.length - 1]
      }
    }
    
    return { saldoAwal: 0, saldoAkhir: 0 }
  }

  private findColumnHeaders(lines: string[]): ColumnHeaders {
    const headers: ColumnHeaders = { dateIdx: -1, transIdx: -1, keluarIdx: -1, masukIdx: -1, balanceIdx: -1 }

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase()
      const cleanLower = lower.replace(/^[|\s]+/, '')
      if (cleanLower.startsWith('tanggal')) headers.dateIdx = i
      else if (cleanLower.startsWith('transaksi')) headers.transIdx = i
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

  private parseAmount(val: string): number | null {
    const clean = val.replace(/\./g, '').replace(/,/g, '').trim()
    const parsed = parseInt(clean, 10)
    return isNaN(parsed) ? null : parsed
  }

  private parseMarkdownTable(
    lines: string[],
    statementPeriod: string,
    initialBalance: number | null,
    timezoneOffset?: string,
  ): { items: BankTransaction[]; lastBalance: number | null } {
    const items: BankTransaction[] = []
    let lastBalance: number | null = initialBalance
 
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue
      if (trimmed.includes('---|') || trimmed.includes(':---|')) continue
 
      const lower = trimmed.toLowerCase()
      if (lower.includes('tanggal') || lower.includes('saldo awal') || lower.includes('saldo akhir') || lower.includes('ringkasan') || lower.includes('rekening')) {
        continue
      }
 
      const rawCells = trimmed.split('|').map(c => c.trim())
      const cells = rawCells.slice(1, rawCells.length - 1)
 
      if (cells.length < 5) continue
 
      const dateRaw = cells[0].trim()
      const dateParts = dateRaw.split(/\s+/)
      if (dateParts.length < 2) continue
 
      const day = dateParts[0].padStart(2, '0')
      const monthStr = dateParts[1]
      
      const yearMatch = statementPeriod.match(/\b(202\d)\b/)
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString()
 
      const descRaw = cells[1].replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim()
      const name = sanitizeTransactionName(descRaw)
      const category = classifyCategory(name)
 
      const balanceVal = this.parseAmount(cells[4])
      
      let amount = 0
      let type: 'income' | 'expense' = 'expense'
 
      if (lastBalance !== null && balanceVal !== null) {
        const diff = balanceVal - lastBalance
        amount = Math.abs(diff)
        type = diff >= 0 ? ('income' as const) : ('expense' as const)
      } else {
        const keluarVal = this.parseAmount(cells[2])
        const masukVal = this.parseAmount(cells[3])
 
        if (keluarVal === null && masukVal === null) continue
 
        const isKeluar = keluarVal !== null && keluarVal > 0
        amount = isKeluar ? keluarVal : (masukVal || 0)
        type = isKeluar ? ('expense' as const) : ('income' as const)
      }
 
      const formattedDate = formatISO8601Date(day, monthStr, year, undefined, timezoneOffset)
 
      items.push({
        date: formattedDate,
        name,
        amount,
        type,
        category,
        bank: this.bankName,
      })
 
      if (balanceVal !== null) {
        lastBalance = balanceVal
      }
    }
 
    return { items, lastBalance }
  }

  private parsePlainTextPage(
    page: string,
    statementPeriod: string,
    openingBalance: number,
    timezoneOffset?: string
  ): { items: BankTransaction[]; lastBalance: number | null } {
    const lines = splitIntoLines(page)
    
    // 1. Extract all transaction dates
    const dates: { day: string; month: string; raw: string }[] = []
    const dateRegex = /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|des|mei|agu|okt)\b/i
    
    for (const line of lines) {
      // Ignore lines containing a 4-digit year to avoid statement headers, periods, and print dates
      if (/\b(202\d)\b/.test(line)) {
        continue
      }
      if (line.includes(' sampai ') || line.includes(' s/d ') || line.includes(' E-Statement ') || line.includes(' REKENING KORAN ')) {
        continue
      }
      const match = line.match(dateRegex)
      if (match) {
        dates.push({
          day: match[1],
          month: match[2],
          raw: line
        })
      }
    }

    // 2. Extract transaction descriptions
    const endKeywords = ['transfer', 'pembayaran', 'pernbayara n', 'pembayara n', 'pernbayaran', 'bunga tabungan', 'biaya', 'cashback', 'qris']
    const rincianStartIdx = lines.findIndex(l => l.toLowerCase().includes('rincian transaksi'))
    const rincianLines = rincianStartIdx !== -1 ? lines.slice(rincianStartIdx + 1) : lines

    const descriptions: string[] = []
    let currentDesc = ''
    
    for (const line of rincianLines) {
      const lineLower = line.toLowerCase()
      
      // Skip headers, footers, page numbers, dates, and pure numbers
      if (
        lineLower.includes('keluar') ||
        lineLower.includes('masuk') ||
        lineLower.includes('saldo akhir') ||
        lineLower.includes('halaman') ||
        dateRegex.test(line) ||
        /^[0-9.,]+$/.test(line)
      ) {
        continue
      }

      currentDesc = currentDesc ? `${currentDesc} ${line}` : line

      let isEnd = false
      if (endKeywords.some(kw => lineLower.includes(kw))) {
        isEnd = true
        if (lineLower === 'bunga tabungan') {
          const nextLines = rincianLines.slice(rincianLines.indexOf(line) + 1)
          const nextDescLine = nextLines.find(nl => {
            const nlLower = nl.toLowerCase().trim()
            return nlLower.length > 0 && 
                   !nlLower.includes('keluar') && 
                   !nlLower.includes('masuk') && 
                   !nlLower.includes('saldo akhir') && 
                   !nlLower.includes('halaman') && 
                   !dateRegex.test(nl) && 
                   !/^[0-9.,]+$/.test(nl)
          })
          if (nextDescLine && nextDescLine.toLowerCase().trim() === 'bunga') {
            isEnd = false
          }
        }
      } else if (lineLower === 'bunga') {
        isEnd = true
      }

      if (isEnd) {
        descriptions.push(currentDesc)
        currentDesc = ''
      }
    }

    if (currentDesc && currentDesc.length > 3) {
      descriptions.push(currentDesc)
    }

    // 3. Extract all numbers
    const numbers: number[] = []
    for (const line of rincianLines) {
      const cleanNum = line.replace(/\./g, '').replace(/,/g, '').trim()
      if (/^\d+$/.test(cleanNum)) {
        numbers.push(parseInt(cleanNum, 10))
      }
    }

    // 4. Align using mathematical search
    const N = dates.length
    
    let iterations = 0
    const MAX_ITERATIONS = 5000

    const findSequence = (
      txIndex: number,
      currBalance: number,
      lastBIdx: number,
      usedIndices: Set<number>,
      path: { amount: number; balance: number; type: 'income' | 'expense' }[]
    ): { amount: number; balance: number; type: 'income' | 'expense' }[] | null => {
      iterations++
      if (iterations > MAX_ITERATIONS) {
        return null
      }

      if (txIndex === N) {
        return path
      }

      for (let bIdx = lastBIdx + 1; bIdx < numbers.length; bIdx++) {
        if (usedIndices.has(bIdx)) continue
        const Bi = numbers[bIdx]

        const Ai = Math.abs(Bi - currBalance)
        
        for (let aIdx = 0; aIdx < numbers.length; aIdx++) {
          if (aIdx === bIdx || usedIndices.has(aIdx)) continue
          if (numbers[aIdx] === Ai) {
            const type = Bi >= currBalance ? ('income' as const) : ('expense' as const)

            usedIndices.add(bIdx)
            usedIndices.add(aIdx)
            path.push({ amount: Ai, balance: Bi, type })

            const result = findSequence(txIndex + 1, Bi, bIdx, usedIndices, path)
            if (result) return result

            path.pop()
            usedIndices.delete(aIdx)
            usedIndices.delete(bIdx)
          }
        }
      }

      return null
    }

    const solution = findSequence(0, openingBalance, -1, new Set<number>(), [])
    
    if (solution && solution.length === N) {
      const items: BankTransaction[] = []
      const yearMatch = statementPeriod.match(/\b(202\d)\b/)
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString()

      for (let i = 0; i < N; i++) {
        const tx = solution[i]
        const date = dates[i]
        const desc = descriptions[i] || 'SeaBank Transaction'
        const formattedDate = formatISO8601Date(date.day, date.month, year, undefined, timezoneOffset)
        const name = sanitizeTransactionName(desc)
        const category = classifyCategory(name)

        items.push({
          date: formattedDate,
          name,
          amount: tx.amount,
          type: tx.type,
          category,
          bank: this.bankName,
        })
      }

      const lastBalance = solution[N - 1]?.balance ?? null
      return { items, lastBalance }
    }

    // Fallback: if search fails, try standard parsePage column layout logic
    return this.parsePage(page, statementPeriod, openingBalance, null, timezoneOffset)
  }
}
