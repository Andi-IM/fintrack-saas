import { Tables } from '@/lib/database.types'
import { CashFlowRepository } from './cash_flow'

const mockCashFlows: Tables<'cash_flow'>[] = [
  {
    id: 'cf-e2e-1',
    created_at: '2026-06-01T08:00:00Z',
    date: '2026-06-01T08:00:00Z',
    income: 5000000,
    expense: 0,
    main_category: 'Pendapatan (Income)',
    sub_category: 'Gaji',
    description: 'Gaji Bulan Juni',
    payment_method: 'Bank JAGO',
    receipt_id: null,
    source_item_id: null,
  },
  {
    id: 'cf-e2e-2',
    created_at: '2026-06-10T12:00:00Z',
    date: '2026-06-10T12:00:00Z',
    income: 0,
    expense: 150000,
    main_category: 'Kebutuhan (Needs)',
    sub_category: 'Makanan',
    description: 'Makan Siang',
    payment_method: 'Tunai',
    receipt_id: null,
    source_item_id: null,
  },
  {
    id: 'cf-e2e-3',
    created_at: '2026-06-15T19:00:00Z',
    date: '2026-06-15T19:00:00Z',
    income: 0,
    expense: 500000,
    main_category: 'Keinginan (Wants)',
    sub_category: 'Hiburan',
    description: 'Nonton Bioskop',
    payment_method: 'Gopay',
    receipt_id: null,
    source_item_id: null,
  },
]

export class FakeCashFlowRepository implements CashFlowRepository {
  public cashFlows: Tables<'cash_flow'>[] = [...mockCashFlows]

  async findAll(): Promise<Tables<'cash_flow'>[]> {
    // Mengembalikan data diurutkan berdasarkan tanggal menurun (descending)
    return [...this.cashFlows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
    
    this.cashFlows.push(newEntry)
    return newEntry
  }

  async update(id: string, data: Partial<Omit<Tables<'cash_flow'>, 'id' | 'created_at' | 'user_id'>>): Promise<void> {
    const index = this.cashFlows.findIndex((cf) => cf.id === id)
    if (index === -1) {
      throw new Error(`Cash flow entry with ID ${id} not found`)
    }
    
    this.cashFlows[index] = {
      ...this.cashFlows[index],
      ...data,
      source_item_id: data.source_item_id !== undefined ? data.source_item_id : this.cashFlows[index].source_item_id
    }
  }

  async delete(id: string): Promise<void> {
    const initialLength = this.cashFlows.length
    this.cashFlows = this.cashFlows.filter((cf) => cf.id !== id)
    
    if (this.cashFlows.length === initialLength) {
      throw new Error(`Cash flow entry with ID ${id} not found`)
    }
  }
}
