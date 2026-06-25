import { OCRResult } from './types'
import { IParser, IReceiptParser } from './interfaces'
import { AtmReceiptParser } from './receipts/atm-parser'
import { RaudhahSwalayanReceiptParser } from './receipts/raudhah-parser'
import { ShoppingReceiptParser } from './receipts/shopping-parser'
import { AciakMartReceiptParser } from './receipts/aciak-parser'
import { CitraSwalayanReceiptParser } from './receipts/citra-parser'
import { MinaSwalayanReceiptParser } from './receipts/mina-parser'
import { GeminiReceiptParser } from './gemini-parser'

export class ReceiptParser implements IParser {
  context: 'Receipt' = 'Receipt'
  private receiptParsers: IReceiptParser[]

  constructor(receiptParsers?: IReceiptParser[]) {
    this.receiptParsers = receiptParsers ?? [
      new AtmReceiptParser(),
      new RaudhahSwalayanReceiptParser(),
      new AciakMartReceiptParser(),
      new CitraSwalayanReceiptParser(),
      new MinaSwalayanReceiptParser(),
      new ShoppingReceiptParser(),
      new GeminiReceiptParser(),
    ]
  }

  async parse(text: string, timezoneOffset?: string, filename?: string): Promise<OCRResult> {
    for (const receiptParser of this.receiptParsers) {
      if (receiptParser.identify(text)) {
        return await receiptParser.parse(text, timezoneOffset, filename)
      }
    }

    throw new Error(
      'Format resit tidak didukung. Tipe resit yang didukung saat ini: ' +
      this.receiptParsers.map(p => p.receiptName).join(', ')
    )
  }
}
