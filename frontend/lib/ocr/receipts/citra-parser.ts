import { OCRResult, ReceiptItem } from '../types'
import { IReceiptParser } from '../interfaces'
import {
  extractReceiptDate,
  extractReceiptMerchant,
  buildReceiptResult,
  classifyReceiptCategory,
  parseIndonesianAmount,
} from '../utils'

/**
 * Specialized parser for Citra Swalayan receipts.
 * Format:
 *   ITEM_NAME
 *   PRICE xQTY SUBTOTAL
 */
export class CitraSwalayanReceiptParser implements IReceiptParser {
  receiptName = 'Citra Swalayan'

  identify(text: string): boolean {
    const textLower = text.toLowerCase()
    return (textLower.includes('citra') && textLower.includes('swalayan')) || 
           (textLower.includes('citra') && textLower.includes('sungai balang'))
  }

  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    const merchant = extractReceiptMerchant(lines)
    const category = classifyReceiptCategory(text)
    const date = extractReceiptDate(text, lines, timezoneOffset)

    // Address
    let address = ''
    const addressLine = lines.find(l => /jl\b|jalan\b|sungai\s*balang/i.test(l))
    if (addressLine) address = addressLine

    // Payment Info
    let amountPaid = 0
    let change = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      if (/tunai|cash|bayar/i.test(line)) {
        const match = lines[i].match(/(?:tunai|cash|bayar)[\s:]*([\d.,]+)/i)
        if (match && parseIndonesianAmount(match[1]) !== null) {
          amountPaid = parseIndonesianAmount(match[1]) || 0
        } else {
          // Check next 2 lines
          for (let j = 1; j <= 2; j++) {
            if (i + j < lines.length) {
              const val = parseIndonesianAmount(lines[i + j])
              if (val !== null) {
                amountPaid = val
                break
              }
            }
          }
        }
      }
      if (/kembali|change/i.test(line)) {
        const match = lines[i].match(/(?:kembali|change)[\s:]*([\d.,]+)/i)
        if (match && parseIndonesianAmount(match[1]) !== null) {
          change = parseIndonesianAmount(match[1]) || 0
        } else {
          for (let j = 1; j <= 2; j++) {
            if (i + j < lines.length) {
              const val = parseIndonesianAmount(lines[i + j])
              if (val !== null) {
                change = val
                break
              }
            }
          }
        }
      }
    }

    // Item Parsing - Robust for fragmented lines
    const items: ReceiptItem[] = []
    const stopIdx = lines.findIndex(l => /total|grand|tunai|cash|bayar|kembali/i.test(l))
    const itemLines = stopIdx !== -1 ? lines.slice(0, stopIdx) : lines

    for (let i = 0; i < itemLines.length; i++) {
      const line = itemLines[i]
      
      // Look for quantity pattern: "x1.00", "X 1.00", "x1", "x100" (OCR error for 1.00)
      const qtyMatch = line.match(/(?:x|[X×*])\s*(\d+[.,]?\d*)/i)
      if (qtyMatch) {
        let rawQty = qtyMatch[1]
        // If OCR read "1.00" as "100", heuristic fix
        if (rawQty === '100') rawQty = '1'
        const qty = parseFloat(rawQty.replace(',', '.')) || 1
        
        let name = ''
        let price = 0
        let subtotal = 0

        // Search BACKWARDS for name and price
        // Usually: NAME then PRICE then QTY
        for (let j = 1; j <= 3; j++) {
          if (i - j < 0) break
          const prev = itemLines[i - j]
          const val = parseIndonesianAmount(prev)
          if (val !== null && subtotal === 0) {
            subtotal = val
            price = Math.round(subtotal / qty)
          } else if (val === null && !name) {
            // Skip address or date-like lines
            if (!/jl\.|jalan|sungai|no\.|rt\d|\d{2}[-/]\d{2}/i.test(prev) && prev.length > 3) {
              name = prev
            }
          }
        }

        // Search FORWARDS for subtotal if not found
        if (subtotal === 0) {
          for (let j = 1; j <= 2; j++) {
            if (i + j < itemLines.length) {
              const val = parseIndonesianAmount(itemLines[i + j])
              if (val !== null) {
                subtotal = val
                price = Math.round(subtotal / qty)
                break
              }
            }
          }
        }

        if (name && subtotal > 0) {
          items.push({ name, amount: subtotal, quantity: qty, price })
        }
      }
    }

    // Total extraction - check multiple possible lines
    let total = 0
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].toLowerCase()
      if (/grand\s*total|total\s*belanja|total\b/i.test(line)) {
        // Skip "Total Item" or "Total Disc"
        if (/item|disc|qty|hem/i.test(line) && !/total\s*belanja/i.test(line)) continue

        const match = lines[i].match(/(?:total|grand)[\s:]*([\d.,]+)/i)
        if (match) {
          total = parseIndonesianAmount(match[1]) || 0
          if (total > 0) break
        }
        
        // Check next 2 lines
        for (let j = 1; j <= 2; j++) {
          if (i + j < lines.length) {
            const val = parseIndonesianAmount(lines[i + j])
            if (val !== null) {
              total = val
              break
            }
          }
        }
        if (total > 0) break
      }
    }

    // Special case for Citra: "Subtotal" line might be the real total if Grand Total fails
    if (total === 0) {
      const subtotalIdx = lines.findIndex(l => /subtotal/i.test(l))
      if (subtotalIdx !== -1 && subtotalIdx + 1 < lines.length) {
        total = parseIndonesianAmount(lines[subtotalIdx + 1]) || 0
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
