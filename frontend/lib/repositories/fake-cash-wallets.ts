import { CashWallet, CashWalletRepository, CashWalletWithBalance } from './types'

import { MOCK_USER_ID, readDB, writeDB } from './fs-mock-db'

export class FakeCashWalletRepository implements CashWalletRepository {
  async findAll(): Promise<CashWalletWithBalance[]> {
    const db = readDB()
    const wallets = [...db.cashWallets]

    const entries = db.cashFlows || []
    const totals = new Map<string, { income: number; expense: number }>()
    for (const entry of entries) {
      const key = entry.payment_method || ''
      const current = totals.get(key) || { income: 0, expense: 0 }
      current.income += Number(entry.income || 0)
      current.expense += Number(entry.expense || 0)
      totals.set(key, current)
    }

    return wallets
      .map((wallet) => {
        const t = totals.get(wallet.name) || { income: 0, expense: 0 }
        const opening = Number(wallet.opening_balance || 0)
        return {
          ...wallet,
          income: t.income,
          expense: t.expense,
          balance: opening + t.income - t.expense,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async findById(id: string): Promise<CashWallet | null> {
    const db = readDB()
    return db.cashWallets.find((w) => w.id === id) || null
  }

  async create(data: { name: string; currency?: string; opening_balance?: number }): Promise<CashWallet> {
    const db = readDB()
    const now = new Date().toISOString()
    const wallet: CashWallet = {
      id: `cw-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      user_id: MOCK_USER_ID,
      name: data.name,
      currency: data.currency ?? 'IDR',
      opening_balance: data.opening_balance ?? 0,
      metadata: {},
      created_at: now,
      updated_at: now,
    }
    db.cashWallets.push(wallet)
    writeDB(db)
    return wallet
  }

  async update(id: string, data: { name?: string; currency?: string; opening_balance?: number }): Promise<void> {
    const db = readDB()
    const index = db.cashWallets.findIndex((w) => w.id === id)
    if (index === -1) {
      throw new Error(`Cash wallet with ID ${id} not found`)
    }
    db.cashWallets[index] = {
      ...db.cashWallets[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    writeDB(db)
  }

  async delete(id: string): Promise<void> {
    const db = readDB()
    const initialLength = db.cashWallets.length
    db.cashWallets = db.cashWallets.filter((w) => w.id !== id)
    if (db.cashWallets.length === initialLength) {
      throw new Error(`Cash wallet with ID ${id} not found`)
    }
    writeDB(db)
  }
}
