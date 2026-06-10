'use server'

import { OCRResult } from '@/lib/ocr/types'
import { documentProcessor } from '@/lib/ocr/processor'

export async function scanDocumentWithAI(formData: FormData): Promise<OCRResult | null> {
  const fileEntry = formData.get('file')
  const contextEntry = formData.get('context')
  const timezoneOffsetEntry = formData.get('timezoneOffset')

  if (!fileEntry || typeof fileEntry === 'string') {
    console.error('OCR Error: No valid file provided')
    throw new Error('No valid file provided')
  }

  if (contextEntry !== 'Receipt' && contextEntry !== 'BankStatement') {
    console.error('OCR Error: Invalid context')
    throw new Error('Invalid context')
  }

  const file = fileEntry
  const context = contextEntry
  const timezoneOffset = typeof timezoneOffsetEntry === 'string' ? timezoneOffsetEntry : undefined

  try {
    // The orchestration is now handled by the documentProcessor
    return await documentProcessor.process(file, context, timezoneOffset)
  } catch (error) {
    console.error('Error during OCR processing:', error)
    const message = error instanceof Error ? error.message : 'Failed to process document with OCR'
    throw new Error(message)
  }
}
