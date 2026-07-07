import { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'

export function buildReceiptStoragePath(input: {
  userId: string
  storeName: string
  originalName: string
  timestamp?: number
  randomSuffix?: string
}): string {
  const parts = input.originalName.split('.')
  const lastPart = parts.length > 1 ? parts.pop()! : ''
  const fileExt = lastPart.trim().toLowerCase() || 'jpg'
  const uniqueName = `${input.timestamp ?? Date.now()}-${input.randomSuffix ?? Math.random().toString(36).substring(2, 9)}.${fileExt}`
  const folder = input.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'receipt'
  return `${input.userId}/${folder}/${uniqueName}`
}

export interface ReceiptRepository {
  save(data: {
    userId: string
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
  }): Promise<Tables<'receipts'>>

  findAll(): Promise<Tables<'receipts'>[]>
  findById(id: string): Promise<Tables<'receipts'> | null>
  delete(id: string): Promise<void>
  update(id: string, data: {
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
  }): Promise<Tables<'receipts'>>

  insertItems(items: { receipt_id: string; product_name: string; quantity: number; price: number }[]): Promise<void>
  deleteItemsByReceiptId(id: string): Promise<void>

  getFilePathById(id: string): Promise<string | null>
  getSignedUrl(path: string): Promise<string>

  uploadFile(path: string, buffer: Buffer, contentType: string): Promise<void>
  removeFile(path: string): Promise<void>
}

export class SupabaseReceiptsRepository implements ReceiptRepository {
  async save(data: Parameters<ReceiptRepository['save']>[0]): Promise<Tables<'receipts'>> {
    const supabase = await createClient()
    const { userId, type, storeName, storeAddress, date, totalPrice, paymentMethod, amountPaid, change, atmId, transactionType, fee, bankStatementItemId, file, items } = data

    let filePath: string | null = null
    if (file) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const fullPath = buildReceiptStoragePath({
        userId,
        storeName,
        originalName: file.name,
      })

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fullPath, buffer, {
          contentType: file.type || 'image/jpeg',
          duplex: 'half',
        })

      if (uploadError) {
        console.error('Error uploading receipt file:', uploadError)
        throw new Error(`Failed to upload receipt file: ${uploadError.message}`)
      }
      filePath = fullPath
    }

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        type,
        store_name: storeName,
        store_address: storeAddress || null,
        date,
        total_price: totalPrice,
        payment_method: paymentMethod || null,
        amount_paid: amountPaid ?? null,
        change: change ?? null,
        atm_id: atmId || null,
        transaction_type: transactionType || null,
        fee: fee ?? 0,
        file_path: filePath,
        bank_statement_item_id: bankStatementItemId || null,
      })
      .select()
      .single()

    if (receiptError) {
      console.error('Error creating receipt record:', receiptError)
      if (filePath) {
        await supabase.storage.from('receipts').remove([filePath])
      }
      throw new Error(`Failed to save receipt: ${receiptError.message}`)
    }

    if (type === 'shopping' && items && items.length > 0) {
      const itemsToInsert = items.map(item => ({
        receipt_id: receipt.id,
        product_name: item.productName,
        quantity: item.quantity,
        price: item.price,
      }))

      const { error: itemsError } = await supabase
        .from('receipts_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Error inserting receipt items:', itemsError)
        await supabase.from('receipts').delete().eq('id', receipt.id)
        if (filePath) {
          await supabase.storage.from('receipts').remove([filePath])
        }
        throw new Error(`Failed to save receipt items: ${itemsError.message}`)
      }
    }

    return receipt
  }

  async findAll(): Promise<Tables<'receipts'>[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        receipts_items (*),
        bank_statement_items (
          *,
          bank_statements (
            bank_name
          )
        )
      `)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching receipts:', error)
      throw new Error(`Failed to fetch receipts: ${error.message}`)
    }
    return data || []
  }

  async findById(id: string): Promise<Tables<'receipts'> | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return null
    }
    return data
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting receipt:', error)
      throw new Error(`Failed to delete receipt: ${error.message}`)
    }
  }

  async update(id: string, data: {
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
  }): Promise<Tables<'receipts'>> {
    const supabase = await createClient()
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .update({
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
      })
      .eq('id', id)
      .select()
      .single()

    if (receiptError) {
      console.error('Error updating receipt record:', receiptError)
      throw new Error(`Failed to update receipt: ${receiptError.message}`)
    }
    return receipt
  }

  async insertItems(items: { receipt_id: string; product_name: string; quantity: number; price: number }[]): Promise<void> {
    const supabase = await createClient()
    const { error: itemsError } = await supabase
      .from('receipts_items')
      .insert(items)

    if (itemsError) {
      console.error('Error inserting receipt items:', itemsError)
      throw new Error(`Failed to insert receipt items: ${itemsError.message}`)
    }
  }

  async deleteItemsByReceiptId(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('receipts_items')
      .delete()
      .eq('receipt_id', id)

    if (error) {
      console.error('Error deleting receipt items:', error)
      throw new Error(`Failed to delete receipt items: ${error.message}`)
    }
  }

  async getFilePathById(id: string): Promise<string | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('receipts')
      .select('file_path')
      .eq('id', id)
      .single()

    if (error) {
      return null
    }
    return data?.file_path || null
  }

  async getSignedUrl(path: string): Promise<string> {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(path, 3600)

    if (error) {
      console.error('Error creating signed URL for receipt:', error)
      throw new Error('Failed to get file access')
    }
    return data.signedUrl
  }

  async uploadFile(path: string, buffer: Buffer, contentType: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.storage
      .from('receipts')
      .upload(path, buffer, { contentType, duplex: 'half' })

    if (error) {
      console.error('Error uploading receipt file:', error)
      throw new Error(`Failed to upload receipt file: ${error.message}`)
    }
  }

  async removeFile(path: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.storage
      .from('receipts')
      .remove([path])

    if (error) {
      console.error('Error deleting receipt file from storage:', error)
      throw new Error(`Failed to delete file from storage: ${error.message}`)
    }
  }
}

const globalForReceipts = globalThis as unknown as {
  receiptRepoInstance: ReceiptRepository | undefined
}

export function getReceiptRepository(): ReceiptRepository {
  if (globalForReceipts.receiptRepoInstance) {
    return globalForReceipts.receiptRepoInstance
  }

  if (process.env.NEXT_PUBLIC_IS_TESTING === 'true') {
    const { FakeReceiptRepository } = require('./fake-receipts')
    globalForReceipts.receiptRepoInstance = new FakeReceiptRepository()
  } else {
    globalForReceipts.receiptRepoInstance = new SupabaseReceiptsRepository()
  }
  return globalForReceipts.receiptRepoInstance!
}

export function setReceiptRepository(mockRepo: ReceiptRepository): void {
  globalForReceipts.receiptRepoInstance = mockRepo
}
