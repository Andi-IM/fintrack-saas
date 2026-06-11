import { OCRResult } from './types'

export interface IExtractor {
  supportedMimeTypes: string[]
  extractText(base64Data: string): Promise<string>
  canHandle(mimeType: string, context: { filename?: string; routeToDoctr?: boolean }): boolean
}

export interface IParser {
  context: 'Receipt' | 'BankStatement'
  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult
}

export interface IBankParser {
  identify(text: string): boolean
  bankName: string
  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult
}

export interface IReceiptParser {
  identify(text: string): boolean
  receiptName: string
  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult
}
