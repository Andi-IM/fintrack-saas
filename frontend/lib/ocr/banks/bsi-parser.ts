import {
  STATEMENT_STOP_KEYWORDS,
  STATEMENT_DATE_REGEX,
  STATEMENT_TIME_REGEX,
  STATEMENT_REF_REGEX,
} from '@/lib/constants/ocr'
import { OCRResult, BankTransaction } from '../types'
import { IBankParser } from '../interfaces'
import {
  parseStatementPeriod,
  formatISO8601Date,
  classifyCategory,
  sanitizeTransactionName,
  parseIndonesianAmount,
  splitIntoLines,
  buildBankResult,
  getMarkdownTableRows,
  extractAmountByKeywords,
} from '../utils'

interface DateEntry {
  date: string
  lineIndex: number
}

export class BsiParser implements IBankParser {
  bankName = 'BSI'

  identify(text: string): boolean {
    const textLower = text.toLowerCase()
    return (
      textLower.includes('bsi') ||
      textLower.includes('laporan rekening') ||
      textLower.includes('wadiah') ||
      textLower.includes('mudharabah')
    )
  }

  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult {
    const lines = splitIntoLines(text)
    const statementPeriod = parseStatementPeriod(text)
    const saldoAwal = this.parseSaldoAwal(text)
    const saldoAkhir = this.parseSaldoAkhir(text)

    // Check if the text contains a Markdown table
    if (text.includes('|---|') || (text.includes('|') && text.toLowerCase().includes('date & time'))) {
      const items = this.parseMarkdownTable(lines, timezoneOffset)
      if (items.length > 0) {
        return buildBankResult(items, this.bankName, statementPeriod, saldoAwal, saldoAkhir)
      }
    }

    const dateEntries = this.extractDates(lines, timezoneOffset)
    const items = this.parseBankStatement(lines, dateEntries, saldoAwal, timezoneOffset)

    return buildBankResult(items, this.bankName, statementPeriod, saldoAwal, saldoAkhir)
  }

  private parseSaldoAwal(text: string): number {
    const lines = splitIntoLines(text)
    return extractAmountByKeywords(text, [/saldo\s+awal/i, /saldo\s+bulan\s+lalu/i], lines)
  }

  private parseSaldoAkhir(text: string): number {
    const lines = splitIntoLines(text)
    return extractAmountByKeywords(text, [/saldo\s+akhir/i, /saldo\s+saat\s+ini/i], lines)
  }

  private extractDates(lines: string[], timezoneOffset?: string): DateEntry[] {
    const entries: DateEntry[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!STATEMENT_DATE_REGEX.test(line)) continue

      // Ignore lines that represent date ranges or periods
      if (line.includes(' - ') || line.toLowerCase().includes('s/d') || line.toLowerCase().includes('sampai')) {
        continue
      }

      // Try to find time on same line or next line
      let timeStr: string | undefined
      const timeMatch = line.match(STATEMENT_TIME_REGEX)
      if (timeMatch) {
        timeStr = timeMatch[0]
      } else if (i + 1 < lines.length && STATEMENT_TIME_REGEX.test(lines[i + 1])) {
        const nextTimeMatch = lines[i + 1].match(STATEMENT_TIME_REGEX)
        if (nextTimeMatch) timeStr = nextTimeMatch[0]
      }

      const date = this.formatDateLine(line, timeStr, timezoneOffset)
      entries.push({ date, lineIndex: i })
    }

    return entries
  }

  private formatDateLine(line: string, timeStr?: string, timezoneOffset?: string): string {
    const dateParts = line.split(/\s+/)
    if (dateParts.length < 2) return new Date().toISOString()

    const day = dateParts[0]
    const monthStr = dateParts[1]
    const yearMatch = line.match(/\b(202\d)\b/)
    const year = yearMatch ? yearMatch[0] : '2025'

    return formatISO8601Date(day, monthStr, year, timeStr, timezoneOffset)
  }

  private parseBankStatement(
    lines: string[],
    dateEntries: DateEntry[],
    saldoAwal: number,
    timezoneOffset?: string,
  ): BankTransaction[] {
    if (this.isColumnLayout(dateEntries)) {
      const items = this.parseColumnLayout(lines, dateEntries, saldoAwal)
      if (items.length > 0) return items
    }

    return this.parseRowLayout(lines, saldoAwal, timezoneOffset)
  }

  private isColumnLayout(dateEntries: DateEntry[]): boolean {
    return (
      dateEntries.length >= 2 &&
      dateEntries.every((entry, i) => i === 0 || entry.lineIndex - dateEntries[i - 1].lineIndex <= 3)
    )
  }

  private parseColumnLayout(
    lines: string[],
    dateEntries: DateEntry[],
    saldoAwal: number,
  ): BankTransaction[] {
    const descList = this.extractColumnDescriptions(lines)
    const runningBalances = this.extractRunningBalances(lines)
    const items: BankTransaction[] = []

    let lastBalance = saldoAwal

    for (let i = 0; i < dateEntries.length; i++) {
      const date = dateEntries[i].date
      const balance = runningBalances[i] || lastBalance
      const prevBalance = i === 0 ? saldoAwal : runningBalances[i - 1] || lastBalance
      const diff = balance - prevBalance

      const amount = Math.abs(diff)
      const type = diff >= 0 ? ('income' as const) : ('expense' as const)
      const rawName = descList[i] || 'Transaction details'
      const name = sanitizeTransactionName(rawName)
      const category = classifyCategory(name)

      if (amount > 0) {
        items.push({ date, name, amount, type, category, bank: this.bankName })
      }

      lastBalance = balance
    }

    return items
  }

  private extractColumnDescriptions(lines: string[]): string[] {
    const descStartIdx = this.findDescriptionStart(lines)
    if (descStartIdx === -1) return []

    const descEndIdx = this.findDescriptionEnd(lines, descStartIdx)
    const descBlockLines = lines.slice(descStartIdx, descEndIdx)

    return this.groupDescriptionLines(descBlockLines)
  }

  private findDescriptionStart(lines: string[]): number {
    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase()
      if (lower.includes('detail transaksi') || lower.includes('rincian')) {
        return i + 1
      }
    }
    return -1
  }

  private findDescriptionEnd(lines: string[], startIdx: number): number {
    for (let i = startIdx - 1; i < lines.length; i++) {
      const lower = lines[i].toLowerCase()
      if (
        lower.includes('no reff') ||
        lower.includes('reff') ||
        lower.includes('debit') ||
        lower.includes('kredit') ||
        lower.includes('saldo') ||
        lower.includes('saido')
      ) {
        return i
      }
    }
    return lines.length
  }

  private groupDescriptionLines(lines: string[]): string[] {
    const descList: string[] = []
    let currentDesc = ''
    let prevLineWasNameStart = false

    for (const line of lines) {
      const lineLower = line.toLowerCase()

      if (lineLower.includes('detail transaksi') || lineLower.includes('no reff')) continue
      if (STATEMENT_REF_REGEX.test(line)) continue

      const isNewStart = this.isNewDescription(line, prevLineWasNameStart)
      if (isNewStart && currentDesc.length > 0) {
        descList.push(currentDesc)
        currentDesc = line
      } else {
        currentDesc = currentDesc ? `${currentDesc} ${line}` : line
      }

      if (isNewStart) {
        const isDanaMasukKeluar = /^(?:dana\s+masuk|dana\s+keluar)\b/i.test(line)
        prevLineWasNameStart = !isDanaMasukKeluar
      } else {
        prevLineWasNameStart = false
      }
    }

    if (currentDesc) descList.push(currentDesc)

    return descList
  }

  private isNewDescription(line: string, prevLineWasNameStart: boolean): boolean {
    const isDanaMasukKeluar = /^(?:dana\s+masuk|dana\s+keluar)\b/i.test(line)
    if (isDanaMasukKeluar) {
      return !prevLineWasNameStart
    }

    const startKeywords = /^(?:setor|tarik|transfer|trf|biaya|bunga|adm|tax|pembayaran|qris|pt|cv|gaji|salary|deposit|interest|flip|m\s+flip)\b/i
    if (startKeywords.test(line)) return true

    return /^[A-Z]/.test(line) && line.length >= 3 && !/^[A-Z\s]+$/.test(line)
  }

  private extractRunningBalances(lines: string[]): number[] {
    const balanceStartIdx = this.findBalanceStart(lines)
    if (balanceStartIdx === -1) return []

    const balanceBlockLines = lines.slice(balanceStartIdx)
    const balances: number[] = []

    for (const line of balanceBlockLines) {
      const val = parseIndonesianAmount(line)
      if (val !== null && val > 0) {
        balances.push(val)
      }
    }

    return balances
  }

  private findBalanceStart(lines: string[]): number {
    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase()
      if (
        (lower === 'saldo' || lower === 'saido' || lower === 'balance' || lower === 'salgo') &&
        !lower.includes('bulan') &&
        !lower.includes('awal') &&
        !lower.includes('akhir')
      ) {
        return i + 1
      }
    }
    // Fallback if exact match not found
    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase()
      if (lower.startsWith('saldo') || lower.startsWith('saido') || lower.startsWith('balance')) {
        return i + 1
      }
    }
    return -1
  }

  private parseRowLayout(lines: string[], saldoAwal: number, timezoneOffset?: string): BankTransaction[] {
    const truncateIndex = this.findTruncationIndex(lines)
    const rowLines = lines.slice(0, truncateIndex)
    const blockStarts = this.findDateBlockStarts(rowLines)

    const items: BankTransaction[] = []
    let lastBalance = saldoAwal

    for (let k = 0; k < blockStarts.length; k++) {
      const block = this.extractBlock(rowLines, blockStarts, k)
      if (!block || block.lines.length === 0) continue

      const result = this.resolveTransactionBlock(block, lastBalance, timezoneOffset)
      if (result) {
        items.push(result.transaction)
        lastBalance = result.newBalance
      }
    }

    return items
  }

  private findTruncationIndex(lines: string[]): number {
    for (let i = 0; i < lines.length; i++) {
      if (STATEMENT_STOP_KEYWORDS.some(keyword => lines[i].toLowerCase().includes(keyword))) {
        return i
      }
    }
    return lines.length
  }

  private findDateBlockStarts(lines: string[]): number[] {
    const starts: number[] = []
    for (let i = 0; i < lines.length; i++) {
      if (STATEMENT_DATE_REGEX.test(lines[i])) {
        starts.push(i)
      }
    }
    return starts
  }

  private extractBlock(
    lines: string[],
    blockStarts: number[],
    index: number,
  ): { dateStr: string; lines: string[] } | null {
    const startIndex = blockStarts[index]
    const endIndex = index + 1 < blockStarts.length ? blockStarts[index + 1] : lines.length
    const blockLines = lines.slice(startIndex, endIndex)

    if (blockLines.length === 0) return null

    return { dateStr: blockLines[0], lines: blockLines.slice(1) }
  }

  private resolveTransactionBlock(
    block: { dateStr: string; lines: string[] },
    lastBalance: number,
    timezoneOffset?: string,
  ): { transaction: BankTransaction; newBalance: number } | null {
    const amounts: number[] = []
    const descLines: string[] = []
    let timeStr: string | undefined

    for (const line of block.lines) {
      const timeMatch = line.match(STATEMENT_TIME_REGEX)
      if (timeMatch) {
        timeStr = timeMatch[0]
        continue
      }

      const val = parseIndonesianAmount(line)
      if (val !== null) {
        amounts.push(val)
      } else if (
        !STATEMENT_REF_REGEX.test(line) &&
        !line.toLowerCase().includes('reff') &&
        !line.toLowerCase().includes('debit') &&
        !line.toLowerCase().includes('kredit')
      ) {
        descLines.push(line)
      }
    }

    if (amounts.length === 0) return null

    const resolved = this.resolveAmounts(amounts, descLines, lastBalance)
    const formattedDate = this.formatDateFromBlock(block.dateStr, timeStr, timezoneOffset)
    const rawName = descLines.join(' ')
    const name = sanitizeTransactionName(rawName)
    const category = classifyCategory(name)

    if (resolved.amount <= 0) return null

    return {
      transaction: {
        date: formattedDate,
        name,
        amount: resolved.amount,
        type: resolved.type,
        category,
        bank: this.bankName,
      },
      newBalance: resolved.newBalance,
    }
  }

  private resolveAmounts(
    amounts: number[],
    descLines: string[],
    lastBalance: number,
  ): { amount: number; type: 'income' | 'expense'; newBalance: number } {
    const descText = descLines.join(' ').toLowerCase()
    const isIncomeKeyword = /setor|masuk|kredit|cr|deposit|gaji|salary|transfer\s*masuk/i.test(descText)

    if (amounts.length >= 3) {
      return this.resolveThreeAmounts(amounts[0], amounts[1], amounts[2])
    }

    if (amounts.length === 2) {
      return this.resolveTwoAmounts(amounts[0], amounts[1], lastBalance, isIncomeKeyword)
    }

    return this.resolveSingleAmount(amounts[0], lastBalance, isIncomeKeyword)
  }

  private resolveThreeAmounts(
    debit: number,
    kredit: number,
    saldo: number,
  ): { amount: number; type: 'income' | 'expense'; newBalance: number } {
    if (kredit > 0 && debit === 0) {
      return { amount: kredit, type: 'income', newBalance: saldo }
    }

    if (debit > 0 && kredit === 0) {
      return { amount: debit, type: 'expense', newBalance: saldo }
    }

    const amount = debit > 0 ? debit : kredit
    const type = debit > 0 ? 'expense' : 'income'
    return { amount, type, newBalance: saldo }
  }

  private resolveTwoAmounts(
    amount: number,
    saldo: number,
    lastBalance: number,
    isIncomeKeyword: boolean,
  ): { amount: number; type: 'income' | 'expense'; newBalance: number } {
    let type: 'income' | 'expense'

    if (lastBalance > 0) {
      type = saldo - lastBalance >= 0 ? 'income' : 'expense'
    } else {
      type = isIncomeKeyword ? 'income' : 'expense'
    }

    return { amount, type, newBalance: saldo }
  }

  private resolveSingleAmount(
    amount: number,
    lastBalance: number,
    isIncomeKeyword: boolean,
  ): { amount: number; type: 'income' | 'expense'; newBalance: number } {
    const type = isIncomeKeyword ? 'income' : 'expense'
    const newBalance = type === 'income'
      ? lastBalance + amount
      : lastBalance - amount

    return { amount, type, newBalance }
  }

  private formatDateFromBlock(dateStr: string, timeStr?: string, timezoneOffset?: string): string {
    const dateParts = dateStr.split(/\s+/)
    if (dateParts.length < 2) return new Date().toISOString()

    const day = dateParts[0]
    const monthStr = dateParts[1]
    const yearMatch = dateStr.match(/\b(202\d)\b/)
    const year = yearMatch ? yearMatch[0] : '2025'

    return formatISO8601Date(day, monthStr, year, timeStr, timezoneOffset)
  }

  private parseMarkdownTable(lines: string[], timezoneOffset?: string): BankTransaction[] {
    const items: BankTransaction[] = []

    const skipKeywords = ['date & time', 'detail transaksi', 'saldo awal', 'mutasi debit', 'mutasi kredit', 'saldo akhir']
    const rows = getMarkdownTableRows(lines, skipKeywords)

    for (const cells of rows) {
      if (cells.length < 5) continue

      const dateRaw = cells[0].replace(/<br\s*\/?>/gi, ' ').trim()
      const dateParts = dateRaw.split(/\s+/)
      if (dateParts.length < 2) continue

      const day = dateParts[0]
      const monthStr = dateParts[1]
      const yearMatch = dateRaw.match(/\b(202\d)\b/)
      const year = yearMatch ? yearMatch[0] : '2026'

      // Try to find time
      let timeStr: string | undefined
      for (const part of dateParts) {
        if (STATEMENT_TIME_REGEX.test(part)) {
          timeStr = part
          break
        }
      }

      const formattedDate = formatISO8601Date(day, monthStr, year, timeStr, timezoneOffset)

      const debitRaw = cells[cells.length - 3]
      const kreditRaw = cells[cells.length - 2]
      
      const debitVal = parseIndonesianAmount(debitRaw)
      const kreditVal = parseIndonesianAmount(kreditRaw)

      if (debitVal === null && kreditVal === null) continue

      const isDebit = debitVal !== null && debitVal > 0
      const isKredit = kreditVal !== null && kreditVal > 0
      if (!isDebit && !isKredit) continue

      const amount = isDebit ? debitVal : (kreditVal || 0)
      const type = isDebit ? ('expense' as const) : ('income' as const)

      let descStartIndex = 1
      let descEndIndex = cells.length - 3
      
      if (cells.length >= 6) {
        const potentialReff = cells[cells.length - 4]
        if (/^[a-zA-Z0-9]+$/.test(potentialReff) && potentialReff.length >= 6) {
          descEndIndex = cells.length - 4
        }
      }

      const descList = cells.slice(descStartIndex, descEndIndex)
        .map(d => d.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim())
        .filter(d => d.length > 0)
      
      const rawName = descList.join(' | ')
      const name = sanitizeTransactionName(rawName)
      const category = classifyCategory(name)

      items.push({
        date: formattedDate,
        name,
        amount,
        type,
        category,
        bank: this.bankName,
      })
    }

    return items
  }
}
