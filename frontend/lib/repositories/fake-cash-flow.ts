import { Tables } from '@/lib/database.types'
import { CashFlowRepository, CashFlowFilterOptions, DashboardCashFlowEntry, PaginatedResult } from './types'

import { MOCK_USER_ID, readDB, writeDB } from './fs-mock-db'

export class FakeCashFlowRepository implements CashFlowRepository {
  async findDashboardEntries(options?: Pick<CashFlowFilterOptions, 'range'>): Promise<DashboardCashFlowEntry[]> {
    const result = await this.findAll(options)
    return result.data.map((entry) => ({
      id: entry.id,
      date: entry.date,
      main_category: entry.main_category,
      description: entry.description,
      income: entry.income,
      expense: entry.expense,
      payment_method: entry.payment_method,
    }))
  }

  async findAll(options?: CashFlowFilterOptions): Promise<PaginatedResult<Tables<'cash_flow'>>> {
    const db = readDB()
    let results = [...db.cashFlows]

    if (options?.date) {
      results = results.filter(cf => cf.date.startsWith(options.date!))
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
        results = results.filter(cf => new Date(cf.date) >= startDate)
      } else if (options.range === 'MTD') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1) // 1st of current month
        results = results.filter(cf => new Date(cf.date) >= startDate)
      } else if (options.range === 'TODAY') {
        startDate.setHours(0, 0, 0, 0) // Midnight today
        results = results.filter(cf => new Date(cf.date) >= startDate)
      } else if (daysToSubtract > 0) {
        startDate.setDate(startDate.getDate() - daysToSubtract)
        results = results.filter(cf => new Date(cf.date) >= startDate)
      }
    }

    if (options?.search) {
      const q = options.search.toLowerCase()
      results = results.filter(cf => 
        (cf.description?.toLowerCase().includes(q)) || 
        (cf.main_category?.toLowerCase().includes(q)) || 
        (cf.sub_category?.toLowerCase().includes(q))
      )
    }

    if (options?.category && options.category !== 'all') {
      results = results.filter(cf => cf.main_category === options.category)
    }

    if (options?.payment_method && options.payment_method !== 'all') {
      results = results.filter(cf => cf.payment_method === options.payment_method)
    }

    if (options?.source && options.source !== 'all') {
      if (options.source === 'receipt') {
        results = results.filter(tx => tx.receipt_id !== null)
      } else if (options.source === 'statement') {
        results = results.filter(tx => tx.source_item_id !== null)
      } else if (options.source === 'manual') {
        results = results.filter(tx => tx.receipt_id === null && tx.source_item_id === null)
      }
    }

    const count = results.length

    // Mengembalikan data diurutkan berdasarkan tanggal menurun (descending)
    results = results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (options?.page && options?.limit) {
      const startIndex = (options.page - 1) * options.limit
      results = results.slice(startIndex, startIndex + options.limit)
    }

    return { data: results, count }
  }

  async findById(id: string): Promise<Tables<'cash_flow'> | null> {
    const db = readDB()
    return db.cashFlows.find(cf => cf.id === id) || null
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
      user_id: MOCK_USER_ID,
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
