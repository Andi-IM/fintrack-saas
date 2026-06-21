import { Tables } from '@/lib/database.types'
import { CashFlowRepository } from './types'

import { readDB, writeDB } from './fs-mock-db'

export class FakeCashFlowRepository implements CashFlowRepository {
  async findAll(): Promise<Tables<'cash_flow'>[]> {
    const db = readDB()
    // Mengembalikan data diurutkan berdasarkan tanggal menurun (descending)
    return [...db.cashFlows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  async create(data: Omit<Tables<'cash_flow'>, 'id' | 'created_at' | 'user_id' | 'source_item_id'> & { source_item_id?: string | null }): Promise<Tables<'cash_flow'>> {
    const newEntry: Tables<'cash_flow'> = {
      id: `cf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      date: data.date,
      main_category: data.main_category,
      sub_category: data.sub_category,
      description: data.description,
      income: data.income,
      expense: data.expense,
      payment_method: data.payment_method,
      receipt_id: data.receipt_id,
      source_item_id: data.source_item_id ?? null,
      created_at: new Date().toISOString(),
    }
    
    const db = readDB()
    db.cashFlows.push(newEntry)
    writeDB(db)
    
    return newEntry
  }

  async update(id: string, data: Partial<Omit<Tables<'cash_flow'>, 'id' | 'created_at' | 'user_id'>>): Promise<void> {
    const db = readDB()
    const index = db.cashFlows.findIndex((cf) => cf.id === id)
    if (index === -1) {
      throw new Error(`Cash flow entry with ID ${id} not found`)
    }
    
    db.cashFlows[index] = {
      ...db.cashFlows[index],
      ...data,
      source_item_id: data.source_item_id !== undefined ? data.source_item_id : db.cashFlows[index].source_item_id
    }
    writeDB(db)
  }

  async delete(id: string): Promise<void> {
    const db = readDB()
    const initialLength = db.cashFlows.length
    db.cashFlows = db.cashFlows.filter((cf) => cf.id !== id)
    
    if (db.cashFlows.length === initialLength) {
      throw new Error(`Cash flow entry with ID ${id} not found`)
    }
    writeDB(db)
  }
}
