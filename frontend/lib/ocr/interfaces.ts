import { OCRResult } from './types'

export interface IExtractor {
  supportedMimeTypes: string[]
  extractText(base64Data: string): Promise<string>
}

export interface IParser {
  context: 'Receipt' | 'BankStatement'
  parse(text: string, timezoneOffset?: string): OCRResult
}

export interface IBankParser {
  identify(text: string): boolean
  bankName: string
  parse(text: string, timezoneOffset?: string): OCRResult
}


