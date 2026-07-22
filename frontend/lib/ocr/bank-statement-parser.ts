import { OCRResult } from './types'
import { IParser, IBankParser } from './interfaces'
import { SeabankParser } from './banks/seabank-parser'
import { JagoParser } from './banks/jago-parser'
import { BniParser } from './banks/bni-parser'
import { BsiParser } from './banks/bsi-parser'
import { OpenAIBankStatementParser } from './openai-parser'

export class BankStatementParser implements IParser {
  context: 'BankStatement' = 'BankStatement'
  private bankParsers: IBankParser[]

  constructor(bankParsers?: IBankParser[]) {
    this.bankParsers = bankParsers ?? [
      new BniParser(),
      new JagoParser(),
      new SeabankParser(),
      new BsiParser(),
      new OpenAIBankStatementParser(),
    ]
  }

  async parse(text: string, timezoneOffset?: string, filename?: string): Promise<OCRResult> {
    const parserFailures: string[] = []

    for (const bankParser of this.bankParsers) {
      if (bankParser.identify(text)) {
        try {
          const result = await bankParser.parse(text, timezoneOffset, filename)
          if (result && result.items && result.items.length > 0) {
            return result
          } else {
            const reason = `${bankParser.bankName} returned 0 items`
            parserFailures.push(reason)
            console.warn(`[OCR] Parser ${reason}, falling back to next parser...`)
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          parserFailures.push(`${bankParser.bankName}: ${message}`)
          console.warn(`[OCR] Parser ${bankParser.bankName} threw an error, falling back to next parser...`, e)
        }
      }
    }

    if (parserFailures.length > 0) {
      throw new Error(`Gagal memproses bank statement. Detail parser: ${parserFailures.join('; ')}`)
    }

    throw new Error(
      'Format bank statement tidak didukung. Bank yang didukung saat ini: ' +
      this.bankParsers.map(p => p.bankName).join(', ')
    )
  }
}
