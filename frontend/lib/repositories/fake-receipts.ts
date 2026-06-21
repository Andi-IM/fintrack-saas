import { Tables } from '@/lib/database.types'
import { ReceiptRepository } from './receipts'
import { readDB, writeDB } from './fs-mock-db'

export class FakeReceiptRepository implements ReceiptRepository {
  private _items: Map<string, Tables<'receipts_items'>[]> = new Map()

  async save(data: Parameters<ReceiptRepository['save']>[0]): Promise<Tables<'receipts'>> {
    const db = readDB()
    const id = `receipt-e2e-${Date.now()}`
    
    // Create mock receipt
    const newReceipt: Tables<'receipts'> = {
      id,
      created_at: new Date().toISOString(),
      type: data.type,
      store_name: data.storeName,
      store_address: data.storeAddress || null,
      date: data.date,
      total_price: data.totalPrice,
      payment_method: data.paymentMethod || null,
      amount_paid: data.amountPaid ?? null,
      change: data.change ?? null,
      atm_id: data.atmId || null,
      transaction_type: data.transactionType || null,
      fee: data.fee ?? 0,
      file_path: data.file ? `mock-path/${data.file.name}` : null,
      bank_statement_item_id: data.bankStatementItemId || null,
    }

    db.receipts.push(newReceipt)
    writeDB(db)

    if (data.items && data.items.length > 0) {
      const itemsToInsert = data.items.map(item => ({
        id: `item-${Date.now()}-${Math.random()}`,
        receipt_id: id,
        product_name: item.productName,
        quantity: item.quantity,
        price: item.price,
        created_at: new Date().toISOString(),
      }))
      this._items.set(id, itemsToInsert)
    }

    return newReceipt
  }

  async findAll(): Promise<any[]> {
    const db = readDB()
    return db.receipts.map(receipt => ({
      ...receipt,
      receipts_items: this._items.get(receipt.id) || [],
      bank_statement_items: null // Simplified for mock
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  async findById(id: string): Promise<Tables<'receipts'> | null> {
    const db = readDB()
    return db.receipts.find(r => r.id === id) || null
  }

  async delete(id: string): Promise<void> {
    const db = readDB()
    db.receipts = db.receipts.filter(r => r.id !== id)
    writeDB(db)
    this._items.delete(id)
  }

  async update(id: string, data: Parameters<ReceiptRepository['update']>[1]): Promise<Tables<'receipts'>> {
    const db = readDB()
    const index = db.receipts.findIndex(r => r.id === id)
    if (index === -1) throw new Error('Receipt not found')

    const updated = {
      ...db.receipts[index],
      type: data.type,
      store_name: data.storeName,
      store_address: data.storeAddress || null,
      date: data.date,
      total_price: data.totalPrice,
      payment_method: data.paymentMethod || null,
      amount_paid: data.amountPaid ?? null,
      change: data.change ?? null,
      atm_id: data.atmId || null,
      transaction_type: data.transactionType || null,
      fee: data.fee ?? 0,
      bank_statement_item_id: data.bankStatementItemId || null,
    }

    db.receipts[index] = updated
    writeDB(db)
    return updated
  }

  async insertItems(items: { receipt_id: string; product_name: string; quantity: number; price: number }[]): Promise<void> {
    if (items.length === 0) return
    const receiptId = items[0].receipt_id
    const existing = this._items.get(receiptId) || []
    
    const newItems = items.map(item => ({
      id: `item-${Date.now()}-${Math.random()}`,
      receipt_id: item.receipt_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      created_at: new Date().toISOString(),
    }))
    
    this._items.set(receiptId, [...existing, ...newItems])
  }

  async deleteItemsByReceiptId(id: string): Promise<void> {
    this._items.delete(id)
  }

  async getFilePathById(id: string): Promise<string | null> {
    const receipt = await this.findById(id)
    return receipt?.file_path || null
  }

  async getSignedUrl(path: string): Promise<string> {
    // Return a dummy data URI for testing
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
  }

  async uploadFile(path: string, buffer: Buffer, contentType: string): Promise<void> {
    // No-op for testing
  }

  async removeFile(path: string): Promise<void> {
    // No-op for testing
  }
}
