import { createClient } from '@/lib/supabase/server'
import { CashWallet, CashWalletRepository, CashWalletWithBalance } from './types'
import { FakeCashWalletRepository } from './fake-cash-wallets'

export class SupabaseCashWalletRepository implements CashWalletRepository {
  async findAll(): Promise<CashWalletWithBalance[]> {
    const supabase = await createClient()
    const { data: wallets, error } = await supabase
      .from('cash_wallets')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }
    if (!wallets || wallets.length === 0) {
      return []
    }

    const walletNames = wallets.map((w) => w.name)
    const { data: entries, error: entriesError } = await supabase
      .from('cash_flow')
      .select('payment_method,income,expense,date')
      .in('payment_method', walletNames)

    if (entriesError) {
      throw new Error(entriesError.message)
    }

    const totals = new Map<string, { income: number; expense: number }>()
    for (const entry of entries || []) {
      const key = entry.payment_method || ''
      const current = totals.get(key) || { income: 0, expense: 0 }
      current.income += Number(entry.income || 0)
      current.expense += Number(entry.expense || 0)
      totals.set(key, current)
    }

    return wallets.map((wallet) => {
      const t = totals.get(wallet.name) || { income: 0, expense: 0 }
      const opening = Number(wallet.opening_balance || 0)
      return {
        ...wallet,
        income: t.income,
        expense: t.expense,
        balance: opening + t.income - t.expense,
      }
    })
  }

  async findById(id: string): Promise<CashWallet | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cash_wallets')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }
    return data
  }

  async create(data: { name: string; currency?: string; opening_balance?: number }): Promise<CashWallet> {
    const supabase = await createClient()
    const { data: inserted, error } = await supabase
      .from('cash_wallets')
      .insert({
        name: data.name,
        currency: data.currency ?? 'IDR',
        opening_balance: data.opening_balance ?? 0,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }
    return inserted
  }

  async update(id: string, data: { name?: string; currency?: string; opening_balance?: number }): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('cash_wallets')
      .update(data)
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('cash_wallets')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }
}

const globalForRepos = globalThis as unknown as {
  cashWalletRepositoryInstance: CashWalletRepository | undefined
}

export function getCashWalletRepository(): CashWalletRepository {
  if (globalForRepos.cashWalletRepositoryInstance) return globalForRepos.cashWalletRepositoryInstance

  if (process.env.NEXT_PUBLIC_IS_TESTING === 'true') {
    globalForRepos.cashWalletRepositoryInstance = new FakeCashWalletRepository()
  } else {
    globalForRepos.cashWalletRepositoryInstance = new SupabaseCashWalletRepository()
  }
  return globalForRepos.cashWalletRepositoryInstance!
}

export function setCashWalletRepository(mockRepo: CashWalletRepository) {
  globalForRepos.cashWalletRepositoryInstance = mockRepo
}
