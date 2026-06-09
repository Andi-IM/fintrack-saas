import { OCRResult } from './types'
import { IParser, IBankParser } from './interfaces'
import { SeabankParser } from './banks/seabank-parser'
import { JagoParser } from './banks/jago-parser'
import { BsiParser } from './banks/bsi-parser'

export class BankStatementParser implements IParser {
  context: 'BankStatement' = 'BankStatement'
  private bankParsers: IBankParser[]

  constructor(bankParsers?: IBankParser[]) {
    this.bankParsers = bankParsers ?? [
      new SeabankParser(),
      new JagoParser(),
      new BsiParser(),
    ]
  }

  parse(text: string): OCRResult {
    for (const bankParser of this.bankParsers) {
      if (bankParser.identify(text)) {
        return bankParser.parse(text)
      }
    }

    const lastParser = this.bankParsers[this.bankParsers.length - 1]
    return lastParser.parse(text)
  }
}
