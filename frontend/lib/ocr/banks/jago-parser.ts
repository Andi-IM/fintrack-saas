import { OCRResult, BankTransaction } from '../types'
import { IBankParser } from '../interfaces'
import {
  parseStatementPeriod,
  formatISO8601Date,
  classifyCategory,
  sanitizeTransactionName,
  buildBankResult,
} from '../utils'

export class JagoParser implements IBankParser {
  bankName = 'Bank JAGO'

  identify(text: string): boolean {
    return text.toLowerCase().includes('jago')
  }

  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult {
    // 1. Determine Dynamic Bank Name from Filename
    let finalBankName = this.bankName
    if (filename) {
      const accountName = this.extractAccountName(filename)
      if (accountName && accountName.toLowerCase() !== 'statement' && accountName.toLowerCase() !== 'history') {
        const capitalized = accountName
          .split(/[\s_-]+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
        finalBankName = `${this.bankName} - ${capitalized}`
      }
    }

    // 2. Parse Statement Period
    const statementPeriod = this.parseJagoPeriod(text)

    // 3. Parse Transactions using the date-split approach
    const dateRegex = /\b(\d{1,2})[\s.]\s*([a-zA-Z]{3,9})\s+(\d{4})\b/g
    const matches: { index: number; length: number; day: string; month: string; year: string; fullDate: string }[] = []
    
    let match
    while ((match = dateRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        day: match[1],
        month: match[2],
        year: match[3],
        fullDate: match[0]
      })
    }

    const items: BankTransaction[] = []
    let firstTxBalance: number | null = null
    let firstTxAmount = 0
    let firstTxType: 'income' | 'expense' = 'income'
    let lastTxBalance = 0

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i]
      const nextMatch = matches[i + 1]
      
      const startIndex = currentMatch.index + currentMatch.length
      const endIndex = nextMatch ? nextMatch.index : text.length
      const segment = text.substring(startIndex, endIndex).trim()
      
      // Amount pattern: +/- followed by numbers
      const amountMatch = segment.match(/([+-])\s*([\d.,]+)/)
      if (amountMatch) {
        const type = amountMatch[1] === '+' ? 'income' : 'expense'
        const amountStr = amountMatch[2]
        const cleanAmount = this.parseCleanAmount(amountStr)
        
        const desc = segment.substring(0, amountMatch.index).trim()
        
        // Balance is the first number after the amount
        const postAmount = segment.substring(amountMatch.index + amountMatch[0].length).trim()
        const balanceMatch = postAmount.match(/^([\d.,]+)/)
        let balance = 0
        if (balanceMatch) {
          balance = this.parseCleanAmount(balanceMatch[1])
        }
        
        // Filter out metadata and false positives
        const lowercaseDesc = desc.toLowerCase()
        if (
          lowercaseDesc.includes('halaman') || 
          lowercaseDesc.includes('saldo terbaru') || 
          lowercaseDesc.includes('menampilkan transaksi') ||
          lowercaseDesc.includes('pockets transactions history')
        ) {
          continue
        }

        // Track balances to calculate overall opening and closing balances
        if (firstTxBalance === null) {
          firstTxBalance = balance
          firstTxAmount = cleanAmount
          firstTxType = type
        }
        lastTxBalance = balance

        const name = sanitizeTransactionName(desc || 'Transaksi Jago')
        const category = classifyCategory(name)

        // Find time
        const timeMatch = segment.match(/\b(\d{2})[.:](\d{2})\b/)
        const timeStr = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : undefined

        const formattedDate = formatISO8601Date(
          currentMatch.day,
          currentMatch.month,
          currentMatch.year,
          timeStr,
          timezoneOffset
        )

        items.push({
          date: formattedDate,
          name,
          amount: cleanAmount,
          type,
          category,
          bank: finalBankName,
        })
      }
    }

    // 4. Resolve Saldo Awal and Saldo Akhir
    let saldoAwal = 0
    let saldoAkhir = 0

    if (firstTxBalance !== null) {
      saldoAwal = firstTxType === 'income' ? firstTxBalance - firstTxAmount : firstTxBalance + firstTxAmount
      saldoAkhir = lastTxBalance
    }

    return buildBankResult(items, finalBankName, statementPeriod, saldoAwal, saldoAkhir)
  }

  private extractAccountName(filename: string): string | null {
    const historyMatch = filename.match(/jago_(.*?)_history/i)
    if (historyMatch && historyMatch[1]) {
      return historyMatch[1].trim()
    }
    const simpleMatch = filename.match(/jago_(.*?)(?:\.pdf|$)/i)
    if (simpleMatch && simpleMatch[1]) {
      const name = simpleMatch[1].trim()
      if (name.length > 0) return name
    }
    return null
  }

  private parseJagoPeriod(text: string): string {
    const rangeRegex = /\b(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})\s*-\s*(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})\b/i
    const match = text.match(rangeRegex)
    if (match) {
      const startMonth = match[2].substring(0, 3).toUpperCase()
      const startYear = match[3]
      const endMonth = match[5].substring(0, 3).toUpperCase()
      const endYear = match[6]
      return `${startMonth} ${startYear} - ${endMonth} ${endYear}`
    }
    
    // Fallback to generic period extraction
    return parseStatementPeriod(text)
  }

  private parseCleanAmount(str: string): number {
    let cleanStr = str.trim()
    if (cleanStr.endsWith(',00') || cleanStr.endsWith('.00')) {
      cleanStr = cleanStr.substring(0, cleanStr.length - 3)
    } else if (cleanStr.includes(',')) {
      cleanStr = cleanStr.split(',')[0]
    }
    cleanStr = cleanStr.replace(/\D/g, '')
    return parseInt(cleanStr, 10) || 0
  }
}
