'use server'

import { z } from 'zod'
import { OCRResult } from '@/lib/ocr/types'
import { documentProcessor } from '@/lib/ocr/processor'
import { ActionResponse } from './types'

const scanInputSchema = z.object({
  context: z.enum(['Receipt', 'BankStatement']),
  timezoneOffset: z.string().optional(),
})

export async function scanDocumentWithAI(formData: FormData): Promise<ActionResponse<OCRResult>> {
  const fileEntry = formData.get('file')
  const contextEntry = formData.get('context')
  const timezoneOffsetEntry = formData.get('timezoneOffset')

  if (!fileEntry || typeof fileEntry === 'string') {
    return { success: false, error: 'No valid file provided' }
  }

  const parsed = scanInputSchema.safeParse({
    context: contextEntry,
    timezoneOffset: typeof timezoneOffsetEntry === 'string' ? timezoneOffsetEntry : undefined,
  })

  if (!parsed.success) {
    return {
      success: false,
      error: 'Invalid input',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const file = fileEntry
  const { context, timezoneOffset } = parsed.data

  try {
    const result = await documentProcessor.process(file, context, timezoneOffset)
    if (!result) {
      return { success: false, error: 'AI returned an empty result.' }
    }
    return { success: true, data: result }
  } catch (error) {
    console.error('Error during OCR processing:', error)
    const message = error instanceof Error ? error.message : 'Failed to process document with OCR'
    return { success: false, error: message }
  }
}
