'use server'

import { z } from 'zod'
import { OCRResult } from '@/lib/ocr/types'
import { documentProcessor } from '@/lib/ocr/processor'
import { ActionResponse } from '@/lib/actions/types'
import { OpenAIBankStatementParser } from '@/lib/ocr/openai-parser'

const RAW_OCR_TEXT_MAX_LENGTH = 200_000
const REPARSE_PROMPT_INPUT_MAX_LENGTH = 240_000

const scanInputSchema = z.object({
  context: z.enum(['Receipt', 'BankStatement']),
  timezoneOffset: z.string().optional(),
})

const receiptItemSchema = z.object({
  name: z.string(),
  amount: z.number(),
  quantity: z.number().optional(),
  price: z.number().optional(),
}).strict()

const bankTransactionSchema = z.object({
  date: z.string(),
  name: z.string(),
  amount: z.number(),
  type: z.enum(['income', 'expense']),
  category: z.string(),
  bank: z.string(),
}).strict()

const ocrResultSchema = z.object({
  rawText: z.string().optional(),
  merchant: z.string().optional(),
  items: z.array(z.union([receiptItemSchema, bankTransactionSchema])).optional(),
  total: z.number().optional(),
  category: z.string().optional(),
  statementPeriod: z.string().optional(),
  totalItems: z.number().optional(),
  bank: z.string().optional(),
  openingBalance: z.number().optional(),
  closingBalance: z.number().optional(),
  address: z.string().optional(),
  date: z.string().optional(),
  paymentMethod: z.string().optional(),
  amountPaid: z.number().optional(),
  change: z.number().optional(),
  type: z.enum(['shopping', 'atm']).optional(),
  atmId: z.string().optional(),
  transactionType: z.enum(['withdrawal', 'deposit', 'transfer']).optional(),
  fee: z.number().optional(),
  referenceNumber: z.string().optional(),
}).strict()

const reparseInputSchema = z.object({
  rawText: z.string().trim().min(1, 'Raw OCR text is required').max(RAW_OCR_TEXT_MAX_LENGTH),
  currentResult: ocrResultSchema,
  timezoneOffset: z.string().optional(),
  filename: z.string().optional(),
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
    
    // Log the parsed result to the terminal for debugging
    console.log('--- AI PARSING RESULT ---')
    console.log(JSON.stringify(result, null, 2))
    console.log('-------------------------')

    return { success: true, data: result }
  } catch (error) {
    console.error('Error during OCR processing:', error)
    const message = error instanceof Error ? error.message : 'Failed to process document with OCR'
    return { success: false, error: message }
  }
}

export async function reparseBankStatementWithAI(input: unknown): Promise<ActionResponse<OCRResult>> {
  const parsed = reparseInputSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: 'Invalid re-scan input',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { rawText, currentResult, timezoneOffset, filename } = parsed.data
  const serializedCurrentResult = JSON.stringify(currentResult)
  if (rawText.length + serializedCurrentResult.length > REPARSE_PROMPT_INPUT_MAX_LENGTH) {
    return { success: false, error: 'Re-scan input is too large. Reduce the current parsed result before trying again.' }
  }

  try {
    const parser = new OpenAIBankStatementParser()
    const result = await parser.reparse(rawText, currentResult, timezoneOffset, filename)

    if (!result) {
      return { success: false, error: 'AI returned an empty re-scan result.' }
    }

    return { success: true, data: { ...result, rawText } }
  } catch (error) {
    console.error('Error during bank statement re-scan:', error)
    const message = error instanceof Error ? error.message : 'Failed to re-scan bank statement'
    return { success: false, error: message }
  }
}
