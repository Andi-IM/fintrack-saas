import { OCRResult } from './types'
import { IParser, IBankParser } from './interfaces'
import { SeabankParser } from './banks/seabank-parser'
import { JagoParser } from './banks/jago-parser'
import { BniParser } from './banks/bni-parser'
import { BsiParser } from './banks/bsi-parser'

export class BankStatementParser implements IParser {
  context: 'BankStatement' = 'BankStatement'
  private bankParsers: IBankParser[]

  constructor(bankParsers?: IBankParser[]) {
    this.bankParsers = bankParsers ?? [
      new BniParser(),
      new JagoParser(),
      new SeabankParser(),
      new BsiParser(),
    ]
  }

  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult {
    for (const bankParser of this.bankParsers) {
      if (bankParser.identify(text)) {
        return bankParser.parse(text, timezoneOffset, filename)
      }
    }

    const lastParser = this.bankParsers[this.bankParsers.length - 1]
    return lastParser.parse(text, timezoneOffset, filename)
  }
}
