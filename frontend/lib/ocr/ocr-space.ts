// @ts-ignore
import { ocrSpace } from 'ocr-space-api-wrapper'
import { IExtractor } from './interfaces'
import fs from 'fs/promises'
import path from 'path'

export class OcrSpaceExtractor implements IExtractor {
  supportedMimeTypes = ['application/pdf']

  async extractText(base64Data: string): Promise<string> {
    const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld'
    
    try {
      const dataUri = `data:application/pdf;base64,${base64Data}`
      const response = await ocrSpace(dataUri, {
        apiKey: apiKey,
        isTable: true,
        OCREngine: "3"
      })

      // Log the raw response for debugging
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const logDir = path.join(process.cwd(), 'logs', 'ocr')
        const logPath = path.join(logDir, `ocr-space-${timestamp}.json`)
        await fs.writeFile(logPath, JSON.stringify(response, null, 2))
        console.log(`OCR.space response logged to: ${logPath}`)
      } catch (logError) {
        console.error('Failed to save OCR.space log:', logError)
      }

      if (response && response.ParsedResults && response.ParsedResults.length > 0) {
        const rawText = (response.ParsedResults as { ParsedText: string }[]).map((res) => res.ParsedText).join('\n---PAGE_BREAK---\n')
        if (rawText && rawText.trim().length > 0) {
          return rawText
        }
      }

      if (response && response.ErrorMessage) {
        throw new Error(Array.isArray(response.ErrorMessage) ? response.ErrorMessage.join(', ') : response.ErrorMessage)
      }

      throw new Error('No text detected in the PDF by OCR.space.')
    } catch (error) {
      console.error('OCR.space API Error:', error)
      const message = error instanceof Error ? error.message : 'Failed to process PDF with OCR.space'
      throw new Error(message)
    }
  }
}
