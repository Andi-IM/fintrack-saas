import { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import { CashFlowRepository, CashFlowFilterOptions } from './types'
import { FakeCashFlowRepository } from './fake-cash-flow'

// Concrete implementation using Supabase client
export class SupabaseCashFlowRepository implements CashFlowRepository {
  async findAll(options?: CashFlowFilterOptions): Promise<Tables<'cash_flow'>[]> {
    const supabase = await createClient()
    let query = supabase.from('cash_flow').select('*').order('date', { ascending: false })

    if (options?.date) {
      // If a specific date is requested (e.g. from chart click)
      const dateStart = new Date(options.date)
      dateStart.setHours(0, 0, 0, 0)
      const dateEnd = new Date(options.date)
      dateEnd.setHours(23, 59, 59, 999)
      
      query = query.gte('date', dateStart.toISOString()).lte('date', dateEnd.toISOString())
    } else if (options?.range && options.range !== 'ALL') {
      const now = new Date()
      let daysToSubtract = 0
      
      switch (options.range) {
        case '1W': daysToSubtract = 7; break
        case '1M': daysToSubtract = 30; break
        case '3M': daysToSubtract = 90; break
        case '1Y': daysToSubtract = 365; break
      }
      
      let startDate = new Date(now)
      if (options.range === 'YTD') {
        startDate = new Date(now.getFullYear(), 0, 1) // Jan 1st
        query = query.gte('date', startDate.toISOString())
      } else if (options.range === 'MTD') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1) // 1st of current month
        query = query.gte('date', startDate.toISOString())
      } else if (options.range === 'TODAY') {
        startDate.setHours(0, 0, 0, 0) // Midnight today
        query = query.gte('date', startDate.toISOString())
      } else if (daysToSubtract > 0) {
        startDate.setDate(startDate.getDate() - daysToSubtract)
        query = query.gte('date', startDate.toISOString())
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }
    return data || []
  }

  async findById(id: string): Promise<Tables<'cash_flow'> | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cash_flow')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(error.message)
    }
    return data
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
