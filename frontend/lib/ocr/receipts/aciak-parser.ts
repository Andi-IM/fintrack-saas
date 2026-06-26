import { RECEIPT_TOTAL_KEYWORDS } from '@/lib/constants/ocr'
import { OCRResult, ReceiptItem } from '../types'
import { IReceiptParser } from '../interfaces'
import {
  extractReceiptDate,
  extractReceiptMerchant,
  buildReceiptResult,
  classifyReceiptCategory,
} from '../utils'

/**
 * Specialized parser for Aciak Mart receipts.
 * Format:
 *   NAME PRICE
 *   xQTY
 *   =
 *   SUBTOTAL
 */
export class AciakMartReceiptParser implements IReceiptParser {
  receiptName = 'Aciak Mart'

  identify(text: string): boolean {
    return /aciak\s*mar/i.test(text)
  }

  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    const merchant = extractReceiptMerchant(lines)
    const category = classifyReceiptCategory(text)
    const date = extractReceiptDate(text, lines, timezoneOffset)

    // Address - Capture multi-line address until Telp/Fax/Email
    let address = ''
    const startIdx = lines.findIndex(l => /jl\b|jalan\b/i.test(l))
    if (startIdx !== -1) {
      const addressParts: string[] = []
      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i]
        if (/telp|fax|email|no\.|ksr:|kasir:/i.test(line)) break
        addressParts.push(line)
      }
      address = addressParts.join(', ')
    }

    // Payment Info
    let amountPaid = 0
    let change = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      if (/tunai|cash|bayar/i.test(line)) {
        const match = lines[i].match(/(?:tunai|cash|bayar)[\s:]*([\d.,]+)/i)
        if (match) {
          amountPaid = parseInt(match[1].replace(/\./g, '').split(',')[0], 10) || 0
        } else if (i + 1 < lines.length) {
          amountPaid = parseInt(lines[i + 1].replace(/\./g, '').split(',')[0], 10) || 0
        }
      }
      if (/kembali|change/i.test(line)) {
        const match = lines[i].match(/(?:kembali|change)[\s:]*([\d.,]+)/i)
        if (match) {
          change = parseInt(match[1].replace(/\./g, '').split(',')[0], 10) || 0
        } else if (i + 1 < lines.length) {
          change = parseInt(lines[i + 1].replace(/\./g, '').split(',')[0], 10) || 0
        }
      }
    }

    // Item Parsing - State based for robustness
    const items: ReceiptItem[] = []
    // Use word boundaries for stop keywords to avoid matching "CASH" in "UMUM/CASH"
    const stopKeywords = /\b(brs=|qty=|total|tunai|kembali)\b|^total\b/i

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Only break if we are past the header (heuristic: i > 5)
      if (i > 5 && stopKeywords.test(line)) break

      // Look for quantity line (e.g. "x1")
      const qtyMatch = line.match(/^(?:x|[×])\s*(\d+)\b/i)
      if (qtyMatch) {
        const qty = parseInt(qtyMatch[1], 10)
        let name = ''
        let price = 0
        let subtotal = 0

        // Look back for name/price
        if (i > 0) {
          const prev1 = lines[i - 1]
          const namePriceMatch = prev1.match(/^(.*?)\s+(\d{3,})\b$/)
          
          if (namePriceMatch) {
            name = namePriceMatch[1].trim()
            price = parseInt(namePriceMatch[2], 10)
          } else {
            // Price might be on prev1, name on prev2
            const val1 = parseInt(prev1.replace(/\./g, ''), 10)
            if (!isNaN(val1) && i > 1) {
              price = val1
              name = lines[i - 2]
            } else {
              name = prev1
            }
          }
        }

        // Look forward for subtotal
        if (i + 1 < lines.length) {
          const next1 = lines[i + 1]
          if (next1 === '=' || next1.startsWith('=')) {
            const subtotalLine = i + 2 < lines.length ? lines[i + 2] : next1.replace('=', '').trim()
            subtotal = parseInt(subtotalLine.replace(/\./g, '').split(',')[0], 10) || 0
          } else {
            const valNext = parseInt(next1.replace(/\./g, '').split(',')[0], 10)
            if (!isNaN(valNext) && !stopKeywords.test(next1)) {
              subtotal = valNext
            }
          }
        }

        if (subtotal === 0 && price > 0) subtotal = price * qty
        if (price === 0 && subtotal > 0) price = Math.round(subtotal / qty)

        if (name && name.length > 2) {
          items.push({ name, amount: subtotal, quantity: qty, price })
        }
      } 
      // Handle inline format: "ITEM PRICE xQTY"
      else {
        const inlineMatch = line.match(/^(.*?)\s+(\d{3,})\s*(?:x|[×])\s*(\d+)/i)
        if (inlineMatch) {
          const name = inlineMatch[1].trim()
          const price = parseInt(inlineMatch[2], 10)
          const qty = parseInt(inlineMatch[3], 10)
          items.push({ name, amount: price * qty, quantity: qty, price })
        } 
        // Handle "ITEM PRICE" format (no 'x' - assuming quantity 1)
        else {
          const namePriceMatch = line.match(/^(.*?)\s+(\d{4,})\b$/)
          if (namePriceMatch && i > 5) { // i > 5 to avoid matching header info
            const name = namePriceMatch[1].trim()
            const price = parseInt(namePriceMatch[2], 10)
            // Verify this isn't a date or address
            if (!/telp|fax|email|jl\.|jalan|no\.|rt\d|rw\d/i.test(name)) {
              items.push({ name, amount: price, quantity: 1, price })
            }
          }
        }
      }
    }

    // Total extraction
    let total = 0
    const totalLineIdx = lines.findIndex(l => /brs=|qty=/i.test(l))
    if (totalLineIdx !== -1) {
      if (totalLineIdx + 1 < lines.length) {
        total = parseInt(lines[totalLineIdx + 1].replace(/\./g, '').split(',')[0], 10) || 0
      } else {
        const match = lines[totalLineIdx].match(/(?:brs=|qty=)[\d\s,.]+\s+([\d.,]+)/i)
        if (match) total = parseInt(match[1].replace(/\./g, '').split(',')[0], 10) || 0
      }
    }

    if (total === 0 && items.length > 0) {
      total = items.reduce((sum, item) => sum + item.amount, 0)
    }

    return buildReceiptResult(merchant, items, total, category, date, {
      type: 'shopping',
      address,
      paymentMethod: 'Cash',
      amountPaid,
      change,
    })
  }
}
