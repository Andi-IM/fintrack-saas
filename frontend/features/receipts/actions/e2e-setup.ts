'use server'

import { setReceiptRepository } from '@/lib/repositories/receipts'
import type { Tables } from '@/lib/database.types'

const mockReceipts: (Tables<'receipts'> & {
  receipts_items: Tables<'receipts_items'>[]
  bank_statement_items?: (Tables<'bank_statement_items'> & { bank_statements: Pick<Tables<'bank_statements'>, 'bank_name'> | null }) | null
})[] = [
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
    receipts_items: [
      { id: 'item-1', receipt_id: 'test-receipt-1', product_name: 'Beras Rojolele 5kg', quantity: 1, price: 75000 },
      { id: 'item-2', receipt_id: 'test-receipt-1', product_name: 'Gula Pasir 1kg', quantity: 1, price: 12500 },
    ],
    bank_statement_items: null
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
    receipts_items: [],
    bank_statement_items: null
  }
]

class MockReceiptRepository {
  private receipts = [...mockReceipts]

  async findAll() {
    return this.receipts
  }

  async findById(id: string) {
    return this.receipts.find(r => r.id === id) || null
  }

  async save(data: {
    type: string
    storeName: string
    storeAddress: string | null
    date: string
    totalPrice: number
    paymentMethod: string | null
    amountPaid: number | null
    change: number | null
    atmId: string | null
    transactionType: string | null
    fee: number | null
    bankStatementItemId: string | null
    file: File | null
    items?: { productName: string; quantity: number; price: number }[]
  }) {
    const newReceipt = {
      id: `test-receipt-${Date.now()}`,
      created_at: new Date().toISOString(),
      type: data.type,
      store_name: data.storeName,
      store_address: data.storeAddress,
      date: data.date,
      total_price: data.totalPrice,
      payment_method: data.paymentMethod,
      amount_paid: data.amountPaid,
      change: data.change,
      atm_id: data.atmId,
      transaction_type: data.transactionType,
      fee: data.fee,
      bank_statement_item_id: data.bankStatementItemId,
      file_path: data.file ? `mock-${Date.now()}` : null,
      receipts_items: (data.items || []).map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        receipt_id: `test-receipt-${Date.now()}`,
        product_name: item.productName,
        quantity: item.quantity,
        price: item.price
      })),
      bank_statement_items: null
    }
    this.receipts.push(newReceipt)
    return newReceipt
  }

  async update(id: string, data: Record<string, unknown>) {
    const idx = this.receipts.findIndex(r => r.id === id)
    if (idx >= 0) {
      this.receipts[idx] = { ...this.receipts[idx], ...data }
      return this.receipts[idx]
    }
    throw new Error('Receipt not found')
  }

  async delete(id: string) {
    this.receipts = this.receipts.filter(r => r.id !== id)
  }

  async insertItems() {}
  async deleteItemsByReceiptId() {}
  async getFilePathById() { return null }
  async getSignedUrl() { return 'http://localhost:3000/mock-receipt-image.jpg' }
  async uploadFile() {}
  async removeFile() {}
}

// Buat instance Fake Database secara global agar state memori dipertahankan antar request server
const fakeReceiptRepository = new MockReceiptRepository()

export async function setupE2eMockData() {
  if (process.env.NEXT_PUBLIC_IS_TESTING === 'true') {
    setReceiptRepository(fakeReceiptRepository)
  }
}