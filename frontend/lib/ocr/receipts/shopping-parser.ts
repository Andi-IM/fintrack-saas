import { RECEIPT_TOTAL_KEYWORDS } from '@/lib/constants/ocr'
import { OCRResult, ReceiptItem } from '../types'
import { IReceiptParser } from '../interfaces'
import {
  extractReceiptDate,
  extractReceiptMerchant,
  buildReceiptResult,
  classifyReceiptCategory,
  extractNumberFromLine,
  parseIndonesianAmount,
} from '../utils'

export class ShoppingReceiptParser implements IReceiptParser {
  receiptName = 'Shopping'

  identify(_text: string): boolean {
    // Fallback parser — always matches
    return true
  }

  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    // 1. Merchant
    const merchant = extractReceiptMerchant(lines)

    // 2. Extract total amount — supports keyword+value on same or next line
    let total = this.extractAmountByKeywords(lines, RECEIPT_TOTAL_KEYWORDS)

    // Fallback: find largest Rp. amount in the document
    if (total === 0) {
      total = this.extractLargestRpAmount(lines)
    }

    // 3. Category matching based on keywords
    const category = classifyReceiptCategory(text)

    // 4. Extract address
    let address = ''
    const addressRegex = /(?:jl\.|jalan|alamat|street)\s+([^\n]+)/i
    const addressMatch = text.match(addressRegex)
    if (addressMatch) {
      address = addressMatch[0].trim()
    } else {
      const addressLine = lines.find(l => /jl\b|jalan\b|block\b|no\.\b/i.test(l))
      if (addressLine) address = addressLine
    }

    // 5. Date & time
    const date = extractReceiptDate(text, lines, timezoneOffset)

    // 6. Extract payment method
    let paymentMethod = 'Cash'
    if (/gopay|go-pay/i.test(text)) paymentMethod = 'GoPay'
    else if (/ovo/i.test(text)) paymentMethod = 'OVO'
    else if (/shopeepay|shopee/i.test(text)) paymentMethod = 'ShopeePay'
    else if (/qris/i.test(text)) paymentMethod = 'QRIS'
    else if (/debit|bca|mandiri|bni|bri|cimb/i.test(text)) paymentMethod = 'Debit Card'
    else if (/credit|visa|mastercard|jcb/i.test(text)) paymentMethod = 'Credit Card'
    else if (/tunai/i.test(text)) paymentMethod = 'Cash'

    // 7. Extract cash paid & change — supports keyword+value on same or next line
    let amountPaid = this.extractAmountByKeywords(lines, [
      /pembayaran/i, /bayar/i, /tunai/i, /diterima/i, /tendered/i, /paid/i, /cash/i,
    ])
    let change = this.extractAmountByKeywords(lines, [
      /kembali/i, /kembalian/i, /change/i, /sisa/i,
    ])
    if (amountPaid === 0) amountPaid = total

    // 8. Parse line items — tries multiple receipt formats
    let items = this.parseItems(lines)

    if (items.length === 0) {
      items.push({
        name: merchant,
        amount: total,
        quantity: 1,
        price: total
      })
    } else {
      const itemsSum = items.reduce((sum, item) => sum + (item.amount || 0), 0)
      if (itemsSum > 0) {
        total = itemsSum
      }
    }

    return buildReceiptResult(merchant, items, total, category, date, {
      type: 'shopping',
      address,
      paymentMethod,
      amountPaid,
      change,
    })
  }

  /**
   * Extract amount from lines matching keyword regexes.
   * If the keyword line has no number, checks the NEXT line.
   */
  private extractAmountByKeywords(lines: string[], keywords: RegExp[]): number {
    let result = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!keywords.some(regex => regex.test(line))) continue

      // Skip lines that are clearly summary headers, not amounts
      // e.g. "Total Disc" with no number is a label, not a value line
      if (/total\s*disc/i.test(line) && !this.extractNumber(line)) continue

      // Try to find a number on the same line
      let val = this.extractNumber(line)

      // If no number on this line, check the next line
      if (!val && i + 1 < lines.length) {
        val = this.extractNumber(lines[i + 1])
      }

      if (val && val > result) {
        result = val
      }
    }

    return result
  }

  /**
   * Extract a numeric value from a line, handling Indonesian number format.
   * Handles: "10.600", "10,600", "9.000,00", "51000", "Rp. 10.600"
   */
  private extractNumber(line: string): number | null {
    return extractNumberFromLine(line)
  }

  /**
   * Extract largest Rp-prefixed amount from lines as fallback.
   * Excludes numbers that look like phone/fax numbers.
   */
  private extractLargestRpAmount(lines: string[]): number {
    let max = 0
    for (const line of lines) {
      // Skip lines that look like phone/fax/address
      if (/telp|fax|phone|jl\.|jalan|no\.|rt\d|rw\d/i.test(line)) continue
      
      const val = this.extractNumber(line)
      // Heuristic: ignore values that are too large (likely not a simple grocery total)
      // or values that look like dates/sequences
      if (val && val > max && val < 5_000_000) {
        max = val
      }
    }
    return max
  }

  /**
   * Parse line items from multiple receipt formats:
   * - Format A: "ITEM PRICE xQTY" (e.g. ACIAK MART: "LEMONIA 130G 9.000 x1")
   * - Format B: "QTY ITEM" then next line has price (e.g. RAUDHAH: "1 TIC TAC MI GORENG / 6.000")
   * - Format C: "ITEM" then "QTY UNIT" then "PRICE" then "SUBTOTAL" (e.g. PUSAT BUAH)
   */
  private parseItems(lines: string[]): ReceiptItem[] {
    // Try Format A first (xQTY pattern)
    let items = this.parseFormatA(lines)
    if (items.length > 0) return items

    // Try Format C (multi-line: name → qty unit → price → subtotal)
    items = this.parseFormatC(lines)
    if (items.length > 0) return items

    // Try Format B (QTY NAME on one line)
    items = this.parseFormatB(lines)
    if (items.length > 0) return items

    return []
  }

  /**
   * Format A: "ITEM PRICE xQTY" — e.g. "LEMONIA 130G 9.000 x1"
   */
  private parseFormatA(lines: string[]): ReceiptItem[] {
    const items: ReceiptItem[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Support both 'x' and multiplication sign '×'
      const qtyMatch = line.match(/(?:\bx|[×])\s*(\d+)\b/i)
      if (!qtyMatch) continue
      const qty = parseInt(qtyMatch[1], 10)

      // Try: "NAME PRICE xQTY"
      const fullMatch = line.match(/^(.*?)\s*(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:x|[×])\s*(\d+)/i)
      if (fullMatch) {
        let name = fullMatch[1].trim()
        const priceStr = fullMatch[2].replace(/\./g, '')
        const price = parseInt(priceStr, 10) || 0

        if (!name && i > 0) name = lines[i - 1]
        if (name) {
          items.push({ name, amount: price * qty, quantity: qty, price })
          continue
        }
      }

      // Try: line starts with "x" or is "xQTY" — name is 2 lines back, price is 1 line back
      if (line.toLowerCase().startsWith('x') || line.startsWith('×') || line.toLowerCase() === `x${qty}` || line === `×${qty}`) {
        if (i > 0) {
          const prevLine = lines[i - 1]
          const price = parseInt(prevLine.replace(/\./g, '').replace(/,/g, ''), 10)
          if (!isNaN(price) && i > 1) {
            items.push({ name: lines[i - 2], amount: price * qty, quantity: qty, price })
            continue
          }
        }
      }
    }

    return items
  }

  /**
   * Format B: "QTY ITEM_NAME" on one line, price on next line.
   * e.g. RAUDHAH: "1 TIC TAC MI GORENG" / "6.000"
   */
  private parseFormatB(lines: string[]): ReceiptItem[] {
    const items: ReceiptItem[] = []
    const stopKeywords = /^(jumlah|total|grand|tunai|cash|bayar|pembayaran|kembali|sisa|terima|barang)/i

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (stopKeywords.test(line)) break

      // Match: starts with a digit (qty), followed by space, then product name
      const match = line.match(/^(\d+)\s+([A-Za-z].{2,})$/)
      if (!match) continue

      const qty = parseInt(match[1], 10)
      const name = match[2].trim()
      if (qty <= 0 || qty > 100) continue

      // Look for price on the next line
      if (i + 1 < lines.length) {
        const priceLine = lines[i + 1]
        const price = parseIndonesianAmount(priceLine)
        if (price && price > 0) {
          items.push({ name, amount: price, quantity: qty, price: Math.round(price / qty) })
          i++ // skip price line
          continue
        }
      }
    }

    return items
  }

  /**
   * Format C: Multi-line format with product name, then qty+unit, then price, then subtotal.
   * e.g. PUSAT BUAH:
   *   "Cimory Uht Choco Tiramisu 250ml"
   *   "1.000 Pcs"
   *   "6,400"
   *   "6,400"
   */
  private parseFormatC(lines: string[]): ReceiptItem[] {
    const items: ReceiptItem[] = []
    const qtyUnitRegex = /^(\d[\d.,]*)\s*(pcs|btl|bks|pak|kg|gr|ltr|ml|buah|unit|lembar|roll|set|box|sachet|sct|dus)\b/i
    const stopKeywords = /^(total|grand|tunai|bayar|pembayaran|kembali|sisa|terima|brs=|brg=)/i

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (stopKeywords.test(line)) break

      // Detect a qty+unit line like "1.000 Pcs" or "5.000 Pcs"
      const qtyMatch = line.match(qtyUnitRegex)
      if (!qtyMatch) continue

      // Parse qty — "1.000" = 1, "5.000" = 5 (thousands separator in qty)
      const rawQty = qtyMatch[1]
      let qty = parseIndonesianAmount(rawQty)
      if (!qty || qty <= 0) continue
      // Quantities like "1.000" in Indonesian = 1 unit (not 1000)
      // But "5.000" could be 5 or 5000. Heuristic: if qty > 100, it's likely thousands-formatted
      if (qty >= 1000 && qty % 1000 === 0) {
        qty = qty / 1000
      }

      // Product name is on the previous line
      if (i === 0) continue
      const name = lines[i - 1]
      // Validate that name looks like a product (contains letters, not a number/date)
      if (/^\d/.test(name) || /^[0-9.,\s]+$/.test(name)) continue

      // Price is on the next line (unit price)
      if (i + 1 >= lines.length) continue
      const unitPrice = parseIndonesianAmount(lines[i + 1])
      if (!unitPrice || unitPrice <= 0) continue

      // Subtotal may be on the line after price (skip it)
      let subtotal = unitPrice * qty
      if (i + 2 < lines.length) {
        const possibleSubtotal = parseIndonesianAmount(lines[i + 2])
        if (possibleSubtotal && possibleSubtotal > 0) {
          subtotal = possibleSubtotal
          i += 2 // skip price + subtotal lines
        } else {
          i += 1 // skip only price line
        }
      }

      items.push({
        name,
        amount: subtotal,
        quantity: qty,
        price: unitPrice,
      })
    }

    return items
  }
}
