'use server'

import { z } from 'zod'
import { invalidateCache } from '@/lib/cache'
import { Tables } from '@/lib/database.types'
import { ActionResponse } from './types'
import { getCashFlowRepository } from '@/lib/repositories/cash_flow'

const cashFlowSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  income: z.number().nonnegative().optional().default(0),
  expense: z.number().nonnegative().optional().default(0),
  main_category: z.string().min(1, 'Main Category is required'),
  sub_category: z.string().optional().default(''),
  description: z.string().optional().default(''),
  payment_method: z.string().optional().default('Cash'),
  receipt_id: z.string().uuid().optional().nullable(),
})

// Data-fetching action - called from Server Components, returns raw data.
export async function getCashFlow(): Promise<Tables<'cash_flow'>[]> {
  try {
    const repo = getCashFlowRepository()
    return await repo.findAll()
  } catch (error: any) {
    console.error("Error fetching cash flow:", error)
    return []
  }
}

export async function insertCashFlow(
  input: z.input<typeof cashFlowSchema>
): Promise<ActionResponse<Tables<'cash_flow'>>> {
  const parsed = cashFlowSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const repo = getCashFlowRepository()
    const insertedData = await repo.create({
      ...parsed.data,
      receipt_id: parsed.data.receipt_id ?? null,
      date: parsed.data.date || new Date().toISOString()
    })
    invalidateCache(['/'])
    return { success: true, data: insertedData }
  } catch (error: any) {
    console.error("Error inserting cash flow:", error)
    return { success: false, error: error.message || 'Database error occurred' }
  }
}

export async function updateCashFlow(
  id: string,
  input: z.input<typeof cashFlowSchema>
): Promise<ActionResponse<void>> {
  const parsed = cashFlowSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const repo = getCashFlowRepository()
    await repo.update(id, parsed.data)
    invalidateCache(['/'])
    return { success: true }
  } catch (error: any) {
    console.error("Error updating cash flow:", error)
    return { success: false, error: error.message || 'Database error occurred' }
  }
}

export async function deleteCashFlow(id: string): Promise<ActionResponse<void>> {
  try {
    const repo = getCashFlowRepository()
    await repo.delete(id)
    invalidateCache(['/'])
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting cash flow:", error)
    return { success: false, error: error.message || 'Database error occurred' }
  }
}
