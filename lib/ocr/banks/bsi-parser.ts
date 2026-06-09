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
  formatTransactionDate,
  classifyCategory,
  sanitizeTransactionName,
  parseIndonesianAmount,
  splitIntoLines,
  buildBankResult,
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

  parse(text: string): OCRResult {
    const lines = splitIntoLines(text)
    const statementPeriod = parseStatementPeriod(text)
    const saldoAwal = this.parseSaldoAwal(text)
    const dateEntries = this.extractDates(lines)
    const items = this.parseBankStatement(lines, dateEntries, saldoAwal)

    return buildBankResult(items, this.bankName, statementPeriod)
  }

  private parseSaldoAwal(text: string): number {
    const lines = splitIntoLines(text)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      if (line.includes('saldo awal') || line.includes('saldo bulan lalu')) {
        // Check same line first
        const match = lines[i].match(/(?:saldo\s+awal|saldo\s+bulan\s+lalu)\s*(?::|rp)?\s*([\d.,\-+oO]+)/i)
        if (match) {
          const val = parseIndonesianAmount(match[1])
          if (val !== null && val > 0) return val
        }
        // Check next 5 lines for a line containing the amount
        for (let j = 1; j <= 5; j++) {
          if (i + j >= lines.length) break
          const nextLine = lines[i + j]
          if (
            nextLine.toLowerCase().includes('mutasi') ||
            nextLine.toLowerCase().includes('saldo') ||
            nextLine.toLowerCase().includes('saido')
          ) {
            continue
          }
          const cleanLine = nextLine.replace(/rp/gi, '').replace(/idr/gi, '').trim()
          const val = parseIndonesianAmount(cleanLine)
          if (val !== null && val > 0) {
            return val
          }
        }
      }
    }
    return 0
  }

  private extractDates(lines: string[]): DateEntry[] {
    const entries: DateEntry[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!STATEMENT_DATE_REGEX.test(line)) continue

      // Ignore lines that represent date ranges or periods
      if (line.includes(' - ') || line.toLowerCase().includes('s/d') || line.toLowerCase().includes('sampai')) {
        continue
      }

      const date = this.formatDateLine(line)
      entries.push({ date, lineIndex: i })
    }

    return entries
  }

  private formatDateLine(line: string): string {
    const dateParts = line.split(/\s+/)
    if (dateParts.length < 2) return new Date().toISOString().split('T')[0]

    const day = dateParts[0]
    const monthStr = dateParts[1]
    const yearMatch = line.match(/\b(202\d)\b/)
    const year = yearMatch ? yearMatch[0] : '2025'

    return formatTransactionDate(day, monthStr, year)
  }

  private parseBankStatement(
    lines: string[],
    dateEntries: DateEntry[],
    saldoAwal: number,
  ): BankTransaction[] {
    if (this.isColumnLayout(dateEntries)) {
      const items = this.parseColumnLayout(lines, dateEntries, saldoAwal)
      if (items.length > 0) return items
    }

    return this.parseRowLayout(lines, saldoAwal)
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

  private parseRowLayout(lines: string[], saldoAwal: number): BankTransaction[] {
    const truncateIndex = this.findTruncationIndex(lines)
    const rowLines = lines.slice(0, truncateIndex)
    const blockStarts = this.findDateBlockStarts(rowLines)

    const items: BankTransaction[] = []
    let lastBalance = saldoAwal

    for (let k = 0; k < blockStarts.length; k++) {
      const block = this.extractBlock(rowLines, blockStarts, k)
      if (!block || block.lines.length === 0) continue

      const result = this.resolveTransactionBlock(block, lastBalance)
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
  ): { transaction: BankTransaction; newBalance: number } | null {
    const amounts: number[] = []
    const descLines: string[] = []

    for (const line of block.lines) {
      if (STATEMENT_TIME_REGEX.test(line)) continue

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
    const formattedDate = this.formatDateFromBlock(block.dateStr)
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

  private formatDateFromBlock(dateStr: string): string {
    const dateParts = dateStr.split(/\s+/)
    if (dateParts.length < 2) return new Date().toISOString().split('T')[0]

    const day = dateParts[0]
    const monthStr = dateParts[1]
    const yearMatch = dateStr.match(/\b(202\d)\b/)
    const year = yearMatch ? yearMatch[0] : '2025'

    return formatTransactionDate(day, monthStr, year)
  }
}
