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
 * Specialized parser for Mina Swalayan receipts.
 * Format:
 *   ITEM_NAME_LINE
 *   QTY PCS   UNIT_PRICE   TOTAL_PRICE
 */
export class MinaSwalayanReceiptParser implements IReceiptParser {
  receiptName = 'Mina Swalayan Besi Jangkang'

  identify(text: string): boolean {
    const textLower = text.toLowerCase()
    return textLower.includes('mina swalayan') || 
           textLower.includes('atha swalayan') ||
           textLower.includes('atha shalayan') ||
           (textLower.includes('mina') && (textLower.includes('besi jangkang') || textLower.includes('best jangkang'))) ||
           (textLower.includes('atha') && textLower.includes('resi jh'))
  }

  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    let merchant = extractReceiptMerchant(lines)
    // Normalize OCR misreads of the store header
    if (/atha\s*(?:shalayan|swalayan)/i.test(merchant) || /resi\s*jh/i.test(merchant)) {
      merchant = 'MINA SWALAYAN BESI JANGKANG'
    }
    const category = classifyReceiptCategory(text)
    const date = extractReceiptDate(text, lines, timezoneOffset)

    // Address
    let address = ''
    const startIdx = lines.findIndex(l => /jl\b|jalan\b|besi-jangkang/i.test(l))
    if (startIdx !== -1) {
      const addressParts = []
      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i]
        if (line.match(/^\d{2,4}[-#]\d+/)) break // Stop if looks like sequence number or date
        if (line.match(/^\d{2}[\/-]\d{2}[\/-]/)) break
        if (line.match(/^telp|fax|ksr/i)) break
        addressParts.push(line)
        if (addressParts.length >= 2) break
      }
      address = addressParts.join(', ')
    }

    // Payment Info
    let paymentMethod = 'Cash'
    let amountPaid = 0
    let change = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      if (/\b(bayar|tunai|cash)\b/i.test(line)) {
        const match = lines[i].match(/(?:bayar|tunai|cash)[\s:]*([\d.,]+)/i)
        if (match) {
          amountPaid = parseIndonesianAmount(match[1]) || 0
        } else if (i + 1 < lines.length) {
          const nextVal = parseIndonesianAmount(lines[i + 1])
          if (nextVal !== null) amountPaid = nextVal
        }
      }
      if (/\b(kembali|change|sisa)\b/i.test(line)) {
        const match = lines[i].match(/(?:kembali|change|sisa)[\s:]*([\d.,]+)/i)
        if (match) {
          change = parseIndonesianAmount(match[1]) || 0
        } else if (i + 1 < lines.length) {
          const nextVal = parseIndonesianAmount(lines[i + 1])
          if (nextVal !== null) change = nextVal
        }
      }
    }

    // Item Parsing - Robust for highly fragmented vertical lines
    const items: ReceiptItem[] = []
    const stopKeywords = /^(total|jumlah|bayar|tunai|kembali|dpp|ppn|terima\s*kasih)/i

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (i > 10 && stopKeywords.test(line)) break

      // Case 1: All in one line "1 PCS 6.500 6.500"
      const inlineMatch = line.match(/^(\d+)\s*(?:PCS|UNIT|BKS|BTL|GR|ML|PCS\s*=|=)?\s+([\d.,]{3,})\s+([\d.,]{3,})$/i)
      if (inlineMatch && i > 0) {
         items.push({
           name: lines[i-1],
           amount: parseIndonesianAmount(inlineMatch[3]) || 0,
           quantity: parseInt(inlineMatch[1], 10),
           price: parseIndonesianAmount(inlineMatch[2]) || 0
         })
         continue
      }

      // Case 2: Highly fragmented vertical lines (Vision pattern)
      // Anchor: Look for QTY line like "1 PCS", "5 PCS", "2.PCS" or even just "1"
      const qtyMatch = line.match(/^(\d+)\s*(?:PCS|UNIT|BKS|BTL|GR|ML|PCS\s*=|=)?$/i) ||
                         line.match(/^(\d+)\.(?:PCS|UNIT|BKS|BTL|GR|ML)$/i)
      if (qtyMatch) {
        const qty = parseInt(qtyMatch[1], 10)
        if (qty === 0 || qty > 100) continue

        let name = ''
        let price = 0
        let subtotal = 0

        // Search backward for price and name
        // Usually: [NAME] then [PRICE] then [QTY]
        if (i > 0) {
          const prevVal = parseIndonesianAmount(lines[i - 1])
          if (prevVal !== null && prevVal > 100) {
            price = prevVal
            if (i > 1) name = lines[i - 2]
          } else {
            // Price might be missing or separated, take prev1 as name
            name = lines[i - 1]
          }
        }

        // Search forward for subtotal
        if (i + 1 < lines.length) {
          const nextVal = parseIndonesianAmount(lines[i + 1])
          if (nextVal !== null && nextVal > 100) {
            subtotal = nextVal
          }
        }

        // Final stitching
        if (name && (price > 0 || subtotal > 0)) {
           if (subtotal === 0) subtotal = price * qty
           if (price === 0) price = Math.round(subtotal / qty)
           
           // Clean name from digits/headers
           if (name.length > 3 && !/^[\d\s.,]+$/.test(name) && !/tanggal|no:|telp/i.test(name)) {
             // Avoid duplicates if Case 1 also matched
             if (!items.some(it => it.name === name && it.amount === subtotal)) {
               items.push({ name, amount: subtotal, quantity: qty, price })
             }
           }
        }
      }
    }

    // Total extraction
    let total = 0
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].toLowerCase()
      if (/\b(total|jumlah|grand total)\b/i.test(line)) {
        if (/\b(item|qty|kuantitas|disc|diskon|hem)\b/i.test(line) && !/total\s*belanja|grand\s*total/i.test(line)) continue

        const match = lines[i].match(/(?:total|harga|belanja|jumlah)[\s:]*([\d.,]{3,})/i)
        if (match) {
          total = parseIndonesianAmount(match[1]) || 0
          if (total > 0) break
        }
        
        for (let j = 1; j <= 2; j++) {
          if (i + j < lines.length) {
            const val = parseIndonesianAmount(lines[i + j])
            if (val !== null && val > 1000) {
              total = val
              break
            }
          }
        }
        if (total > 0) break
      }
    }

    if (total === 0 && items.length > 0) {
      total = items.reduce((sum, item) => sum + (item.amount || 0), 0)
    }

    return buildReceiptResult(merchant, items, total, category, date, {
      type: 'shopping',
      address,
      paymentMethod,
      amountPaid,
      change,
    })
  }
}
