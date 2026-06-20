import { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'

// Interface representing the cash flow database access layer
export interface CashFlowRepository {
  findAll(): Promise<Tables<'cash_flow'>[]>
  create(data: Omit<Tables<'cash_flow'>, 'id' | 'created_at' | 'user_id' | 'source_item_id'> & { source_item_id?: string | null }): Promise<Tables<'cash_flow'>>
  update(id: string, data: Partial<Omit<Tables<'cash_flow'>, 'id' | 'created_at' | 'user_id'>>): Promise<void>
  delete(id: string): Promise<void>
}

// Concrete implementation using Supabase client
export class SupabaseCashFlowRepository implements CashFlowRepository {
  async findAll(): Promise<Tables<'cash_flow'>[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cash_flow')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }
    return data || []
  }

  async create(data: Omit<Tables<'cash_flow'>, 'id' | 'created_at' | 'user_id' | 'source_item_id'> & { source_item_id?: string | null }): Promise<Tables<'cash_flow'>> {
    const supabase = await createClient()
    const { data: insertedData, error } = await supabase
      .from('cash_flow')
      .insert(data)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }
    return insertedData
  }

  async update(id: string, data: Partial<Omit<Tables<'cash_flow'>, 'id' | 'created_at' | 'user_id'>>): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('cash_flow')
      .update(data)
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('cash_flow')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }
}

let repositoryInstance: CashFlowRepository | null = null

export function getCashFlowRepository(): CashFlowRepository {
  if (repositoryInstance) return repositoryInstance

  if (process.env.NEXT_PUBLIC_IS_TESTING === 'true') {
    const { FakeCashFlowRepository } = require('./fake-cash-flow')
    repositoryInstance = new FakeCashFlowRepository()
  } else {
    repositoryInstance = new SupabaseCashFlowRepository()
  }
  return repositoryInstance!
}

// Helper function to inject mock repository during test suites
export function setCashFlowRepository(mockRepo: CashFlowRepository) {
  repositoryInstance = mockRepo
}
