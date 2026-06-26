import { OCRResult } from './types'
import { IParser, IReceiptParser } from './interfaces'
import { OpenAIReceiptParser } from './openai-parser'

export class ReceiptParser implements IParser {
  context: 'Receipt' = 'Receipt'
  private receiptParsers: IReceiptParser[]

  constructor(receiptParsers?: IReceiptParser[]) {
    this.receiptParsers = receiptParsers ?? [
      new OpenAIReceiptParser(),
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
