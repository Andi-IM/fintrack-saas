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
    for (const bankParser of this.bankParsers) {
      if (bankParser.identify(text)) {
        return await bankParser.parse(text, timezoneOffset, filename)
      }
    }

    throw new Error(
      'Format bank statement tidak didukung. Bank yang didukung saat ini: ' +
      this.bankParsers.map(p => p.bankName).join(', ')
    )
  }
}
