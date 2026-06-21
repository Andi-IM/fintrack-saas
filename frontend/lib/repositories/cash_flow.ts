import { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import { CashFlowRepository } from './types'
import { FakeCashFlowRepository } from './fake-cash-flow'

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

const globalForRepos = globalThis as unknown as {
  cashFlowRepositoryInstance: CashFlowRepository | undefined
}

export function getCashFlowRepository(): CashFlowRepository {
  if (globalForRepos.cashFlowRepositoryInstance) return globalForRepos.cashFlowRepositoryInstance

  if (process.env.NEXT_PUBLIC_IS_TESTING === 'true') {
    globalForRepos.cashFlowRepositoryInstance = new FakeCashFlowRepository()
  } else {
    globalForRepos.cashFlowRepositoryInstance = new SupabaseCashFlowRepository()
  }
  return globalForRepos.cashFlowRepositoryInstance!
}

// Helper function to inject mock repository during test suites
export function setCashFlowRepository(mockRepo: CashFlowRepository) {
  globalForRepos.cashFlowRepositoryInstance = mockRepo
}
