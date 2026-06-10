'use server'

import { OCRResult } from '@/lib/ocr/types'
import { documentProcessor } from '@/lib/ocr/processor'

export async function scanDocumentWithAI(formData: FormData): Promise<OCRResult | null> {
  const file = formData.get('file') as File
  const context = formData.get('context') as 'Receipt' | 'BankStatement'
  const timezoneOffset = (formData.get('timezoneOffset') as string) || undefined

  if (!file) {
    console.error('OCR Error: No file provided')
    throw new Error('No file provided')
  }

  try {
    // The orchestration is now handled by the documentProcessor
    return await documentProcessor.process(file, context, timezoneOffset)
  } catch (error) {
    console.error('Error during OCR processing:', error)
    const message = error instanceof Error ? error.message : 'Failed to process document with OCR'
    throw new Error(message)
  }
}
