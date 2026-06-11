import { OCRResult, ReceiptItem } from '../types'
import { IReceiptParser } from '../interfaces'
import {
  extractReceiptDate,
  buildReceiptResult,
  classifyReceiptCategory,
} from '../utils'

export class AtmReceiptParser implements IReceiptParser {
  receiptName = 'ATM'

  identify(text: string): boolean {
    // Use specific ATM keywords to avoid false positives
    return /penarikan\s*tunai|setoran\s*tunai|tarik\s*tunai|setor\s*tunai|struk\s*transaksi|id\s*atm|no\s*kartu.*\d{4,}/i.test(text)
  }

  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    // 1. Merchant / Bank name — for ATM, look for known bank names
    const merchant = this.extractBankName(lines)

    // 2. Date & time
    const date = extractReceiptDate(text, lines, timezoneOffset)

    // 3. Build a label-value map from the OCR text
    const labelValueMap = this.buildLabelValueMap(lines)

    // 4. Total amount (penarikan/setoran amount)
    let total = this.extractAmountFromMap(labelValueMap, ['penarikan', 'setoran', 'nominal', 'jumlah'])

    // Fallback: find RP-prefixed amounts
    if (total === 0) {
      total = this.extractFirstRpAmount(lines)
    }

    // 5. Detect transaction type
    let transactionType: 'withdrawal' | 'deposit' | 'transfer' | undefined = undefined
    if (/tarik\s*tunai|penarikan/i.test(text)) {
      transactionType = 'withdrawal'
    } else if (/setor\s*tunai|setoran/i.test(text)) {
      transactionType = 'deposit'
    } else if (/transfer/i.test(text)) {
      transactionType = 'transfer'
    }

    // 6. Extract ATM ID / Terminal
    let atmId = ''
    // Try label-value map first
    const atmIdFromMap = this.extractValueFromMap(labelValueMap, ['id atm', '1d atm', 'terminal', 'tid'])
    if (atmIdFromMap && atmIdFromMap.length > 2 && !/^\d{2}$/.test(atmIdFromMap)) {
      atmId = atmIdFromMap
    } else {
      // Fallback 1: specific ATM pattern in the text (e.g. ATM21101)
      const specificMatch = text.match(/\b(atm\d+|tid\d+)\b/i)
      if (specificMatch) {
        atmId = specificMatch[1].toUpperCase()
      } else {
        // Fallback 2: regex on full text
        const atmIdMatch = text.match(/(?:terminal|atm\s*id|id\s*atm|1d\s*atm|atm\s*no|tid)\s*:?\s*(\w+)/i)
        if (atmIdMatch) {
          const val = atmIdMatch[1].trim()
          if (val.length > 2 && !/^\d{2}$/.test(val)) {
            atmId = val
          }
        }
      }
    }

    // 7. Extract admin fee
    let fee = 0
    const feeFromMap = this.extractAmountFromMap(labelValueMap, ['biaya', 'admin', 'fee', 'charge'])
    if (feeFromMap > 0) {
      fee = feeFromMap
    }

    // 8. Category
    const detectedCategory = classifyReceiptCategory(text)
    const category = detectedCategory === 'Other' ? 'ATM' : detectedCategory

    // ATM receipts have no line items
    const items: ReceiptItem[] = [{
      name: transactionType
        ? `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} - ${merchant}`
        : merchant,
      amount: total,
      quantity: 1,
      price: total,
    }]

    return buildReceiptResult(merchant, items, total, category, date, {
      type: 'atm',
      atmId: atmId || undefined,
      transactionType,
      fee: fee || undefined,
    })
  }

  /**
   * Extract bank name from the first few lines.
   * BSI ATM receipts start with "BSI" or "BANK SYARIAH INDONESIA".
   */
  private extractBankName(lines: string[]): string {
    const bankKeywords = [
      { regex: /^bsi$/i, name: 'BSI' },
      { regex: /bank syariah/i, name: 'BSI' },
      { regex: /^bca$/i, name: 'BCA' },
      { regex: /^bni$/i, name: 'BNI' },
      { regex: /^bri$/i, name: 'BRI' },
      { regex: /^mandiri$/i, name: 'Mandiri' },
      { regex: /^cimb/i, name: 'CIMB Niaga' },
    ]

    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      for (const bank of bankKeywords) {
        if (bank.regex.test(lines[i])) {
          return bank.name
        }
      }
    }

    return lines[0] || 'Unknown Bank'
  }

  /**
   * Build a label→value map from BSI-style OCR output where
   * labels and values appear in separate column groups.
   *
   * Handles two common patterns:
   * Pattern 1 (inline): "PENARIKAN : RP. 100.000"
   * Pattern 2 (vertical): Labels listed first, then values with ":" prefix
   */
  private buildLabelValueMap(lines: string[]): Map<string, string> {
    const map = new Map<string, string>()

    // First pass: inline "LABEL : VALUE" patterns
    for (const line of lines) {
      const inlineMatch = line.match(/^([A-Za-z\s]+)\s*:\s*(.+)$/i)
      if (inlineMatch) {
        const label = inlineMatch[1].trim().toLowerCase()
        const value = inlineMatch[2].trim()
        map.set(label, value)
      }
    }

    // Second pass: vertical layout — detect label block followed by value block
    const COLON_LABELS = [
      'no kartu', 'card no', 'no. kartu', 'card number',
      'no rekening', 'acc no', 'rekening', 'no. rekening', 'no rek', 'account number', 'acc number',
      'penarikan', 'withdrawal',
      'setoran', 'deposit',
      'nominal', 'amount', 'jumlah',
      'saldo', 'balance', 'saldo rekening',
      'no resi', 'resi', 'no. resi', 'receipt no',
      'no referensi', 'ref no', 'no. referensi', 'no. ref', 'ref. no'
    ]

    const labelLines: string[] = []
    const valueLines: string[] = []

    for (const line of lines) {
      // Value lines start with ":"
      if (/^:\s+/.test(line)) {
        valueLines.push(line.replace(/^:\s*/, '').trim())
        continue
      }

      // Check if line matches one of the COLON_LABELS exactly (case-insensitive)
      const trimmedLower = line.trim().toLowerCase()
      const isColonLabel = COLON_LABELS.some(l => trimmedLower === l)
      if (isColonLabel) {
        labelLines.push(trimmedLower)
      }
    }

    // Pair up labels and values
    for (let i = 0; i < Math.min(labelLines.length, valueLines.length); i++) {
      if (!map.has(labelLines[i])) {
        map.set(labelLines[i], valueLines[i])
      }
    }

    return map
  }

  /**
   * Extract a numeric amount from the label-value map.
   */
  private extractAmountFromMap(map: Map<string, string>, keys: string[]): number {
    for (const key of keys) {
      for (const [label, value] of map.entries()) {
        if (label.includes(key)) {
          const amount = this.parseAtmAmount(value)
          if (amount > 0) return amount
        }
      }
    }
    return 0
  }

  /**
   * Extract a string value from the label-value map.
   */
  private extractValueFromMap(map: Map<string, string>, keys: string[]): string | null {
    for (const key of keys) {
      for (const [label, value] of map.entries()) {
        if (label.includes(key)) {
          return value
        }
      }
    }
    return null
  }

  /**
   * Parse ATM amount: "RP. 100.000" → 100000, "RP.1.084.024" → 1084024
   */
  private parseAtmAmount(raw: string): number {
    let clean = raw.replace(/rp\.?\s*/gi, '').trim()
    // Remove dots used as thousands separators (3-digit groups)
    if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
      clean = clean.replace(/\./g, '')
    }
    // Remove commas similarly
    if (/^\d{1,3}(,\d{3})+$/.test(clean)) {
      clean = clean.replace(/,/g, '')
    }
    const val = parseInt(clean, 10)
    return isNaN(val) ? 0 : val
  }

  /**
   * Fallback: find the first RP-prefixed amount in the text.
   */
  private extractFirstRpAmount(lines: string[]): number {
    for (const line of lines) {
      const match = line.match(/rp\.?\s*([\d.,]+)/i)
      if (match) {
        const amount = this.parseAtmAmount(match[1])
        if (amount > 0) return amount
      }
    }
    return 0
  }
}
