import { RECEIPT_TOTAL_KEYWORDS, RECEIPT_CATEGORY_PATTERNS } from '@/lib/constants/ocr'
import { OCRResult, ReceiptItem } from './types'
import { IParser } from './interfaces'

export class ReceiptParser implements IParser {
  context: 'Receipt' = 'Receipt'

  parse(text: string): OCRResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    // 1. Merchant: assume it's the first line
    const merchant = lines[0] || 'Unknown Merchant'

    // 2. Extract total amount
    let total = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (RECEIPT_TOTAL_KEYWORDS.some(regex => regex.test(line))) {
        const numberMatches = line.match(/\d+([.,]\d+)?/g)
        if (numberMatches && numberMatches.length > 0) {
          const cleanNumber = numberMatches[numberMatches.length - 1].replace(/[.,]/g, '')
          const val = parseInt(cleanNumber, 10)
          if (!isNaN(val) && val > total) {
            total = val
          }
        }
      }
    }

    // Fallback to find largest number in the document
    if (total === 0) {
      const allNumbers = text.match(/\b\d{4,7}\b/g)
      if (allNumbers) {
        const parsedNumbers = allNumbers.map(n => parseInt(n, 10))
        total = Math.max(...parsedNumbers, 0)
      }
    }

    // 3. Category matching based on keywords
    let category = 'Other'
    const textLower = text.toLowerCase()
    for (const pattern of RECEIPT_CATEGORY_PATTERNS) {
      if (pattern.regex.test(textLower)) {
        category = pattern.category
        break
      }
    }

    // 4. Parse line items
    const items: ReceiptItem[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      const qtyMatch = line.match(/\bx\s*(\d+)\b/i)
      if (qtyMatch) {
        const qty = parseInt(qtyMatch[1], 10)
        
        const fullMatch = line.match(/^(.*?)\s*(\d{1,3}(?:\.\d{3})+|\d+)\s*x\s*(\d+)/i)
        if (fullMatch) {
          let name = fullMatch[1].trim()
          const priceStr = fullMatch[2].replace(/\./g, '')
          const price = parseInt(priceStr, 10) || 0
          
          if (!name && i > 0) {
            name = lines[i - 1]
          }
          
          if (name) {
            items.push({
              name,
              amount: price * qty
            })
            continue
          }
        }

        if (line.toLowerCase().startsWith('x') || line.toLowerCase() === `x${qty}`) {
          if (i > 0) {
            const prevLine = lines[i - 1]
            const price = parseInt(prevLine.replace(/\./g, '').replace(/,/g, ''), 10)
            
            if (!isNaN(price) && i > 1) {
              const name = lines[i - 2]
              items.push({
                name,
                amount: price * qty
              })
              continue
            }
          }
        }
      }
    }

    if (items.length === 0) {
      items.push({
        name: merchant,
        amount: total
      })
    } else {
      const itemsSum = items.reduce((sum, item) => sum + item.amount, 0)
      if (itemsSum > 0) {
        total = itemsSum
      }
    }

    return {
      merchant,
      items,
      total,
      category
    }
  }
}
