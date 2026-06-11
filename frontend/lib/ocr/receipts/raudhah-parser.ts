import { OCRResult, ReceiptItem } from '../types'
import { IReceiptParser } from '../interfaces'
import {
  extractReceiptDate,
  buildReceiptResult,
  parseIndonesianAmount,
  classifyReceiptCategory,
  extractNumberFromLine,
} from '../utils'

export class RaudhahSwalayanReceiptParser implements IReceiptParser {
  receiptName = 'RaudhahSwalayan'

  identify(text: string): boolean {
    return /raudhah\s*swalayan/i.test(text)
  }

  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    // 1. Merchant
    const merchantLine = lines.find(l => /raudhah\s*swalayan/i.test(l))
    const merchant = merchantLine || 'Raudhah Swalayan'

    // 2. Address
    const addressLine = lines.find(l => /jln\b|jl\b|jalan\b/i.test(l))
    const address = addressLine || ''

    // 3. Date & Time
    const date = extractReceiptDate(text, lines, timezoneOffset)

    // 4. Total and payment details
    const total = this.extractAmountForKeyword(lines, /grand\s*tota/i) ||
                  this.extractAmountForKeyword(lines, /tunai/i) ||
                  this.extractAmountForKeyword(lines, /jumlah/i)

    const amountPaid = this.extractAmountForKeyword(lines, /pembayaran/i) || total
    const change = this.extractAmountForKeyword(lines, /sisa/i)
    const paymentMethod = /tunai/i.test(text) ? 'Cash' : 'Other'

    // 5. Category
    const category = classifyReceiptCategory(text)

    // 6. Items
    const items = this.parseItems(lines)

    // If no items parsed, fallback to single item with merchant name
    const finalItems = items.length > 0 ? items : [{
      name: merchant,
      amount: total,
      quantity: 1,
      price: total,
    }]

    // Recalculate total if items exist
    const finalTotal = items.length > 0
      ? items.reduce((sum, item) => sum + (item.amount || 0), 0)
      : total

    return buildReceiptResult(merchant, finalItems, finalTotal, category, date, {
      type: 'shopping',
      address,
      paymentMethod,
      amountPaid,
      change,
    })
  }

  private extractAmountForKeyword(lines: string[], keywordRegex: RegExp): number {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (keywordRegex.test(line)) {
        // Search succeeding lines (up to 3 lines) for the first valid number
        for (let j = 0; j <= 3; j++) {
          if (i + j < lines.length) {
            const val = this.extractNumber(lines[i + j])
            if (val !== null && val > 0) {
              return val
            }
          }
        }
      }
    }
    return 0
  }

  private extractNumber(line: string): number | null {
    return extractNumberFromLine(line)
  }

  private parseItems(lines: string[]): ReceiptItem[] {
    const items: ReceiptItem[] = []
    const startIndex = lines.findIndex(l => /netto|nama\s*produk/i.test(l))
    const stopKeywords = /^(jumlah|total|grand|tunai|cash|bayar|pembayaran|kembali|sisa|terima|barang)/i

    let i = startIndex !== -1 ? startIndex + 1 : 0

    if (startIndex === -1) {
      // Find the first line that looks like the start of an item
      while (i < lines.length) {
        if (/^\d+$/.test(lines[i]) || /^\d+\s+[A-Za-z]/.test(lines[i])) {
          break
        }
        i++
      }
    }

    while (i < lines.length) {
      const line = lines[i]
      if (stopKeywords.test(line)) {
        break
      }

      // Check 3-line format:
      // Line 1: Qty (e.g. "1")
      // Line 2: Name (e.g. "RELIABLE CB 2010 CUT")
      // Line 3: Netto (e.g. "7.500")
      if (i + 2 < lines.length) {
        const qtyStr = lines[i]
        const nameStr = lines[i + 1]
        const priceStr = lines[i + 2]

        const qty = parseInt(qtyStr, 10)
        const price = parseIndonesianAmount(priceStr)
        const isValidName = nameStr.length > 0 && !/^\d/.test(nameStr) && !stopKeywords.test(nameStr)

        if (!isNaN(qty) && qty > 0 && price !== null && price > 0 && isValidName) {
          items.push({
            name: nameStr,
            amount: price,
            quantity: qty,
            price: Math.round(price / qty),
          })
          i += 3
          continue
        }
      }

      // Fallback format: "QTY ITEM_NAME" on one line, price on next line
      const matchFallback = line.match(/^(\d+)\s+([A-Za-z].{2,})$/)
      if (matchFallback && i + 1 < lines.length) {
        const qty = parseInt(matchFallback[1], 10)
        const name = matchFallback[2].trim()
        const priceLine = lines[i + 1]
        const price = parseIndonesianAmount(priceLine)

        if (qty > 0 && qty <= 100 && price && price > 0 && !stopKeywords.test(name)) {
          items.push({
            name,
            amount: price,
            quantity: qty,
            price: Math.round(price / qty),
          })
          i += 2
          continue
        }
      }

      i++
    }

    return items
  }
}
