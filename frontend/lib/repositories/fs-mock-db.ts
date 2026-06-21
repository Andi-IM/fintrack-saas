import fs from 'fs'
import path from 'path'
import { Tables } from '@/lib/database.types'

export interface MockDatabase {
  cashFlows: Tables<'cash_flow'>[]
  statements: Tables<'bank_statements'>[]
  statementItems: Tables<'bank_statement_items'>[]
  receipts: Tables<'receipts'>[]
}

const DB_PATH = path.join(process.cwd(), '.e2e-db.json')

export const DEFAULT_MOCK_DATA: MockDatabase = {
  cashFlows: [
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
  ],
  statements: [],
  statementItems: [],
  receipts: [
    {
      id: 'test-receipt-1',
      created_at: '2024-06-15T10:00:00Z',
      type: 'shopping',
      store_name: 'Raudhah Swalayan',
      store_address: 'Jl. Pemuda No. 123, Jakarta',
      date: '2024-06-15T10:30:00Z',
      total_price: 125500,
      payment_method: 'Qris',
      amount_paid: 150000,
      change: 24500,
      atm_id: null,
      transaction_type: null,
      fee: 0,
      bank_statement_item_id: null,
      file_path: null,
      user_id: 'test-user-id'
    },
    {
      id: 'test-receipt-2',
      created_at: '2024-06-14T14:00:00Z',
      type: 'atm',
      store_name: 'Bank Syariah Indonesia',
      store_address: 'Jl. Sudirman No. 456, Jakarta',
      date: '2024-06-14T14:15:00Z',
      total_price: 500000,
      payment_method: null,
      amount_paid: null,
      change: null,
      atm_id: 'S1ARJAGO',
      transaction_type: 'withdrawal',
      fee: 5000,
      bank_statement_item_id: null,
      file_path: null,
      user_id: 'test-user-id'
    }
  ]
}

export function readDB(): MockDatabase {
  if (!fs.existsSync(DB_PATH)) {
    writeDB(DEFAULT_MOCK_DATA)
    return DEFAULT_MOCK_DATA
  }
  try {
    const rawData = fs.readFileSync(DB_PATH, 'utf-8')
    return JSON.parse(rawData) as MockDatabase
  } catch (error) {
    console.error('Failed to read mock DB, returning default:', error)
    return DEFAULT_MOCK_DATA
  }
}

export function writeDB(data: MockDatabase): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to write mock DB:', error)
  }
}

export function resetDB(): void {
  writeDB(DEFAULT_MOCK_DATA)
}
