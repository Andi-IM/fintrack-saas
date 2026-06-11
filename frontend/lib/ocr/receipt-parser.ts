import { OCRResult } from './types'
import { IParser, IReceiptParser } from './interfaces'
import { AtmReceiptParser } from './receipts/atm-parser'
import { ShoppingReceiptParser } from './receipts/shopping-parser'

export class ReceiptParser implements IParser {
  context: 'Receipt' = 'Receipt'
  private receiptParsers: IReceiptParser[]

  constructor(receiptParsers?: IReceiptParser[]) {
    this.receiptParsers = receiptParsers ?? [
      new AtmReceiptParser(),
      new ShoppingReceiptParser(),
    ]
  }

  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult {
    for (const receiptParser of this.receiptParsers) {
      if (receiptParser.identify(text)) {
        return receiptParser.parse(text, timezoneOffset, filename)
      }
    }

    throw new Error(
      'Format resit tidak didukung. Tipe resit yang didukung saat ini: ' +
      this.receiptParsers.map(p => p.receiptName).join(', ')
    )
  }
}
