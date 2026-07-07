import { IExtractor, IParser } from './interfaces'
import { OCRResult } from './types'
import { VisionExtractor } from './vision'
import { ReceiptParser } from './receipt-parser'
import { BankStatementParser } from './bank-statement-parser'
import { SeabankParser } from './banks/seabank-parser'
import { JagoParser } from './banks/jago-parser'
import { BniParser } from './banks/bni-parser'
import { BsiParser } from './banks/bsi-parser'
import { OpenAIReceiptParser, OpenAIBankStatementParser } from './openai-parser'

export class DocumentProcessor {
  private static readonly instance: DocumentProcessor = new DocumentProcessor()
  private extractors: IExtractor[] = []
  private parsers: IParser[] = []

  private constructor() {
    // Register default strategies
    this.registerExtractor(new VisionExtractor())
    
    this.registerParser(new ReceiptParser([
      new OpenAIReceiptParser(),
    ]))
    this.registerParser(new BankStatementParser([
      new BniParser(),
      new JagoParser(),
      new SeabankParser(),
      new BsiParser(),
      new OpenAIBankStatementParser(),
    ]))
  }

  public static getInstance(): DocumentProcessor {
    return DocumentProcessor.instance
  }

  registerExtractor(extractor: IExtractor) {
    this.extractors.push(extractor)
  }

  registerParser(parser: IParser) {
    this.parsers.push(parser)
  }

  async process(file: File, context: 'Receipt' | 'BankStatement', timezoneOffset?: string): Promise<OCRResult | null> {
    // 1. Convert File to base64
    const bytes = await file.arrayBuffer()
    const base64Data = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || this.inferMimeType(file.name)

    // 2. Filter capable extractors
    const capableExtractors = this.extractors.filter(e =>
      e.canHandle(mimeType, { filename: file.name })
    )

    if (capableExtractors.length === 0) {
      throw new Error(`No OCR extractor found for file type: ${mimeType}`)
    }

    let rawText = ''
    let lastError: Error | null = null

    // 3. Try each capable extractor until one succeeds
    for (const extractor of capableExtractors) {
      try {
        console.log(`Attempting text extraction with ${extractor.constructor.name}...`)
        rawText = await extractor.extractText(base64Data)
        
        if (rawText && rawText.trim().length > 0) {
          console.log(`Text extracted successfully using ${extractor.constructor.name}:`)
          console.log('--- START RAW TEXT ---')
          console.log(rawText)
          console.log('--- END RAW TEXT ---')
          break // Success!
        }
      } catch (error) {
        console.error(`Extractor ${extractor.constructor.name} failed:`, error)
        lastError = error instanceof Error ? error : new Error(String(error))
        continue // Try next one
      }
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error(
        `Failed to extract text from file. ${lastError ? `Last error: ${lastError.message}` : 'All extractors returned empty result.'}`
      )
    }

    console.log(`Final raw text length: ${rawText.length}`)

    // 4. Select Parser based on context
    const parser = this.parsers.find(p => p.context === context)
    if (!parser) {
      throw new Error(`No parser found for context: ${context}`)
    }

    // 5. Parse Text
    return await parser.parse(rawText, timezoneOffset, file.name)
  }

  private inferMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf': return 'application/pdf'
      case 'jpg':
      case 'jpeg': return 'image/jpeg'
      case 'png': return 'image/png'
      case 'webp': return 'image/webp'
      default: return 'application/octet-stream'
    }
  }
}

// Export a singleton instance
export const documentProcessor = DocumentProcessor.getInstance()
