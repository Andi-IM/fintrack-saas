'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Tables } from '@/lib/database.types'
import { ActionResponse } from './types'

const transactionSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  type: z.enum(['expense', 'income']),
  category: z.string().min(1, 'Category is required'),
  note: z.string().optional().default(''),
  paymentMethod: z.string().optional().default('Cash'),
  change: z.number().nonnegative().optional().default(0),
  items: z.any().optional(),
})

// Data-fetching action — called from Server Components, returns raw data.
export async function getTransactions(): Promise<Tables<'transactions'>[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error("Error fetching transactions:", error)
    return []
  }
  return data || []
}

export async function insertTransaction(
  input: z.input<typeof transactionSchema>
): Promise<ActionResponse<Tables<'transactions'>>> {
  const parsed = transactionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()
  const { data: insertedData, error } = await supabase
    .from('transactions')
    .insert({ ...parsed.data, date: parsed.data.date || new Date().toISOString().split("T")[0] })
    .select()
    .single()

  if (error) {
    console.error("Error inserting transaction:", error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true, data: insertedData }
}

export async function updateTransaction(
  id: string,
  input: z.input<typeof transactionSchema>
): Promise<ActionResponse<void>> {
  const parsed = transactionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('transactions')
    .update(parsed.data)
    .eq('id', id)

  if (error) {
    console.error("Error updating transaction:", error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

export async function deleteTransaction(id: string): Promise<ActionResponse<void>> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Error deleting transaction:", error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

