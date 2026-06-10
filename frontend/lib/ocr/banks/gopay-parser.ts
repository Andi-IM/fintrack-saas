import { OCRResult, BankTransaction } from '../types'
import { IBankParser } from '../interfaces'
import {
  parseStatementPeriod,
  formatISO8601Date,
  classifyCategory,
  sanitizeTransactionName,
  buildBankResult,
} from '../utils'

export class GopayParser implements IBankParser {
  bankName = 'GoPay'

  identify(text: string): boolean {
    const lower = text.toLowerCase()
    return lower.includes('gopay') || lower.includes('gojek')
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
    const statementPeriod = this.parseGopayPeriod(text)

    // 3. Parse Transactions using the date-split approach (DD/MM/YYYY)
    const dateRegex = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g
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
    let totalRupiahIncome = 0
    let totalRupiahExpense = 0

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i]
      const nextMatch = matches[i + 1]
      
      const startIndex = currentMatch.index + currentMatch.length
      const endIndex = nextMatch ? nextMatch.index : text.length
      const segment = text.substring(startIndex, endIndex).trim()
      
      // Match transaction ID: Typically 19-22 alphanumeric characters containing '20' + 6 digits representing the date
      const txIdRegex = /\b([a-z\d]{2,4}20\d{6}[a-z\d]{5,12})\b/i
      const txIdMatch = segment.match(txIdRegex)

      let txId = ''
      let desc = ''
      let postTx = ''

      if (txIdMatch) {
        txId = txIdMatch[1]
        desc = segment.substring(0, txIdMatch.index).trim()
        postTx = segment.substring(txIdMatch.index + txIdMatch[0].length).trim()
      } else {
        // Fallback to method-based splitting (GoPay Coins/Saldo)
        const methodRegex = /GoPay\s+(Coins|Saldo)/i
        const methodMatch = segment.match(methodRegex)
        if (methodMatch) {
          const beforeMethod = segment.substring(0, methodMatch.index).trim()
          // Check if there's a long alphanumeric word at the end (likely transaction ID)
          const words = beforeMethod.split(/\s+/)
          if (words.length > 1 && words[words.length - 1].length >= 10) {
            txId = words[words.length - 1]
            desc = words.slice(0, -1).join(' ')
          } else {
            desc = beforeMethod
          }
          postTx = segment.substring(methodMatch.index).trim()
        } else {
          // If neither found, this might not be a transaction row or is too noisy
          continue
        }
      }

      // Extract amount from post-TxId text
      const amountMatch = postTx.match(/(-?Rp\s*[\d.,]+|-?[\d.,]+)/i)
      if (!amountMatch) {
        continue
      }

      const amountStr = amountMatch[1]
      // Determine transaction type: negative sign means expense, positive/no-sign means income
      const type = amountStr.startsWith('-') ? 'expense' : 'income'
      const cleanAmount = this.parseCleanAmount(amountStr)

      // Track Rupiah balance (only transactions containing 'Saldo' in their payment method)
      const isRupiah = postTx.toLowerCase().includes('saldo') || segment.toLowerCase().includes('saldo')
      if (isRupiah) {
        if (type === 'income') {
          totalRupiahIncome += cleanAmount
        } else {
          totalRupiahExpense += cleanAmount
        }
      }

      // Clean up description: filter out metadata, page headers/footers, or false positives
      const name = sanitizeTransactionName(desc || 'Transaksi GoPay')
      const category = classifyCategory(name)

      // Find time in the segment
      const timeMatch = segment.match(/\b(\d{2})[.:](\d{2})\b/)
      const timeStr = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : undefined

      // Format ISO8601 date (since months are numbers, we bypass STATEMENT_MONTH_MAP)
      const formattedDate = `${currentMatch.year}-${currentMatch.month.padStart(2, '0')}-${currentMatch.day.padStart(2, '0')}T${timeStr ? timeStr + ':00' : '00:00:00'}${timezoneOffset || '+07:00'}`

      items.push({
        date: formattedDate,
        name,
        amount: cleanAmount,
        type,
        category,
        bank: finalBankName,
      })
    }

    const saldoAwal = 0
    const saldoAkhir = totalRupiahIncome - totalRupiahExpense
    return buildBankResult(items, finalBankName, statementPeriod, saldoAwal, saldoAkhir)
  }

  private extractAccountName(filename: string): string | null {
    const cleanName = (name: string): string => {
      let trimmed = name.trim()
      // Strip trailing dates like 2026-06-10 or 25052023 or 2026
      trimmed = trimmed.replace(/[\s_-]+(?:\d{4}[\s_-]\d{2}[\s_-]\d{2}|\d{2}[\s_-]\d{2}[\s_-]\d{4}|\d{8}|\d{4})$/, '')
      return trimmed.trim()
    }

    const mainPattern = /gopay\s+transaction\s+history[\s_-]+(.*?)(?:\.pdf|$)/i
    const mainMatch = filename.match(mainPattern)
    if (mainMatch && mainMatch[1]) {
      const name = cleanName(mainMatch[1])
      if (name.length > 0 && !/^[\d\s._-]+$/.test(name)) return name
    }

    const historyMatch = filename.match(/gopay[\s_-]+(.*?)[\s_-]+history/i)
    if (historyMatch && historyMatch[1]) {
      const name = cleanName(historyMatch[1])
      const nameLower = name.toLowerCase()
      if (name.length > 0 && !nameLower.startsWith('transaction') && !/^[\d\s._-]+$/.test(name)) return name
    }

    const simpleMatch = filename.match(/gopay[\s_-]+(.*?)(?:\.pdf|$)/i)
    if (simpleMatch && simpleMatch[1]) {
      const name = cleanName(simpleMatch[1])
      const nameLower = name.toLowerCase()
      if (name.length > 0 && !nameLower.startsWith('transaction history') && !nameLower.startsWith('history') && !/^[\d\s._-]+$/.test(name)) return name
    }

    return null
  }

  private parseGopayPeriod(text: string): string {
    const rangeRegex = /\b(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})\s*[-–—\s\d]*\s+(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})\b/i
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
    // Remove Rp symbol and any negative sign
    cleanStr = cleanStr.replace(/^-?Rp\s*/i, '').replace(/^-/, '')
    if (cleanStr.endsWith(',00') || cleanStr.endsWith('.00')) {
      cleanStr = cleanStr.substring(0, cleanStr.length - 3)
    } else if (cleanStr.includes(',')) {
      if (/,00$/.test(cleanStr)) {
        cleanStr = cleanStr.substring(0, cleanStr.length - 3)
      } else {
        cleanStr = cleanStr.split(',')[0]
      }
    }
    cleanStr = cleanStr.replace(/\D/g, '')
    return parseInt(cleanStr, 10) || 0
  }
}
