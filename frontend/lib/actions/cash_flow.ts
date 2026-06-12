'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Tables } from '@/lib/database.types'
import { ActionResponse } from './types'

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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cash_flow')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error("Error fetching cash flow:", error)
    return []
  }
  return data || []
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

  const supabase = await createClient()
  const { data: insertedData, error } = await supabase
    .from('cash_flow')
    .insert({ ...parsed.data, date: parsed.data.date || new Date().toISOString() })
    .select()
    .single()

  if (error) {
    console.error("Error inserting cash flow:", error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true, data: insertedData }
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

  const supabase = await createClient()
  const { error } = await supabase
    .from('cash_flow')
    .update(parsed.data)
    .eq('id', id)

  if (error) {
    console.error("Error updating cash flow:", error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

export async function deleteCashFlow(id: string): Promise<ActionResponse<void>> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cash_flow')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Error deleting cash flow:", error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}
