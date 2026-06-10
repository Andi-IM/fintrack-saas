import { IExtractor, IParser } from './interfaces'
import { OCRResult } from './types'
import { VisionExtractor } from './vision'
import { OcrSpaceExtractor } from './ocr-space'
import { ReceiptParser } from './receipt-parser'
import { BankStatementParser } from './bank-statement-parser'
import { SeabankParser } from './banks/seabank-parser'
import { JagoParser } from './banks/jago-parser'
import { BniParser } from './banks/bni-parser'
import { BsiParser } from './banks/bsi-parser'
import { DoctrOcrExtractor } from './doctr'

export class DocumentProcessor {
  private static instance: DocumentProcessor | null = null
  private extractors: IExtractor[] = []
  private parsers: IParser[] = []

  private constructor() {
    // Register default strategies
    this.registerExtractor(new DoctrOcrExtractor())
    this.registerExtractor(new VisionExtractor())
    this.registerExtractor(new OcrSpaceExtractor())
    
    this.registerParser(new ReceiptParser())
    this.registerParser(new BankStatementParser([
      new BniParser(),
      new JagoParser(),
      new SeabankParser(),
      new BsiParser(),
    ]))
  }

  public static getInstance(): DocumentProcessor {
    if (!DocumentProcessor.instance) {
      DocumentProcessor.instance = new DocumentProcessor()
    }
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

    // 2. Select Extractor based on MIME type and Bank Jago check
    // Jago filename format: "Jago_(nama_rekening)_History_(tanggal).pdf"
    const isJago = file.name.toLowerCase().includes('jago')
    const routeToDoctr = isJago && !!process.env.OCR_SERVICE_URL

    const extractor = this.extractors.find(e => 
      e.canHandle(mimeType, { filename: file.name, routeToDoctr })
    )
    if (!extractor) {
      throw new Error(`No OCR extractor found for file type: ${mimeType}`)
    }

    // 3. Extract Text
    const rawText = await extractor.extractText(base64Data)
    console.log(`Text extracted using ${extractor.constructor.name}:`, rawText)

    // 4. Select Parser based on context
    const parser = this.parsers.find(p => p.context === context)
    if (!parser) {
      throw new Error(`No parser found for context: ${context}`)
    }

    // 5. Parse Text
    return parser.parse(rawText, timezoneOffset, file.name)
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
