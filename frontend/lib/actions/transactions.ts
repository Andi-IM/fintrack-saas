'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

interface LineItem {
  id: string
  description: string
  category: string
  amount: number
}

// We map to the Database.public.Tables.transactions
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

export async function insertTransaction(data: TablesInsert<'transactions'>) {
  const supabase = await createClient()
  const { data: insertedData, error } = await supabase
    .from('transactions')
    .insert({ ...data, date: data.date || new Date().toISOString().split("T")[0] })
    .select()
    .single()

  if (error) {
    console.error("Error inserting transaction:", error)
    return null
  }

  revalidatePath('/')
  return insertedData
}

export async function updateTransaction(id: string, data: TablesUpdate<'transactions'>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('transactions')
    .update(data)
    .eq('id', id)

  if (error) {
    console.error("Error updating transaction:", error)
    return false
  }

  revalidatePath('/')
  return true
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Error deleting transaction:", error)
    return false
  }

  revalidatePath('/')
  return true
}
