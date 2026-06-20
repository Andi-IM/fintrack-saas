'use server'

import { z } from 'zod'
import { unstable_cache } from 'next/cache'
import { invalidateCache, invalidateCacheTags } from '@/lib/cache'
import { getReceiptRepository } from '@/lib/repositories/receipts'
import { Tables } from '@/lib/database.types'
import { ActionResponse } from '@/lib/actions/types'

const receiptItemSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  price: z.number().nonnegative('Price must be greater than or equal to 0'),
})

const saveReceiptSchema = z.object({
  type: z.enum(['shopping', 'atm']).optional().default('shopping'),
  storeName: z.string().min(1, 'Store/Bank name is required'),
  storeAddress: z.string().optional().nullable(),
  date: z.string().min(1, 'Date is required'),
  totalPrice: z.number().nonnegative('Total price must be greater than or equal to 0'),
  paymentMethod: z.string().optional().nullable(),
  amountPaid: z.number().nonnegative().optional().nullable(),
  change: z.number().nonnegative().optional().nullable(),
  atmId: z.string().optional().nullable(),
  transactionType: z.enum(['withdrawal', 'deposit', 'transfer']).optional().nullable(),
  fee: z.number().nonnegative().optional().nullable(),
  bankStatementItemId: z.string().uuid().optional().nullable(),
  items: z.array(receiptItemSchema).optional().default([]),
})

export interface SaveReceiptInput extends z.infer<typeof saveReceiptSchema> {
  file?: File | null
}

export async function saveReceipt(input: SaveReceiptInput): Promise<ActionResponse<{ receiptId: string }>> {
  const { file, ...validationInput } = input
  const parsed = saveReceiptSchema.safeParse(validationInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const repo = getReceiptRepository()

    const receipt = await repo.save({
      type: parsed.data.type,
      storeName: parsed.data.storeName,
      storeAddress: parsed.data.storeAddress ?? null,
      date: parsed.data.date,
      totalPrice: parsed.data.totalPrice,
      paymentMethod: parsed.data.paymentMethod ?? null,
      amountPaid: parsed.data.amountPaid ?? null,
      change: parsed.data.change ?? null,
      atmId: parsed.data.atmId ?? null,
      transactionType: parsed.data.transactionType ?? null,
      fee: parsed.data.fee ?? 0,
      bankStatementItemId: parsed.data.bankStatementItemId ?? null,
      file: file || null,
      items: parsed.data.items,
    })

    invalidateCache(['/receipts', '/'])
    invalidateCacheTags(['receipts'])
    return { success: true, data: { receiptId: receipt.id } }
  } catch (error: any) {
    console.error('Error saving receipt:', error)
    return { success: false, error: error.message || 'Database error occurred' }
  }
}

export type ReceiptWithItems = Tables<'receipts'> & {
  receipts_items: Tables<'receipts_items'>[]
  bank_statement_items?: (Tables<'bank_statement_items'> & {
    bank_statements: Pick<Tables<'bank_statements'>, 'bank_name'> | null
  }) | null
}

const _fetchReceipts = async (): Promise<ActionResponse<ReceiptWithItems[]>> => {
  try {
    const repo = getReceiptRepository()
    const data = await repo.findAll()
    return { success: true, data: data as ReceiptWithItems[] }
  } catch (error: any) {
    console.error('Error fetching receipts:', error)
    return { success: false, error: `Failed to fetch receipts: ${error.message}` }
  }
}

const _getCachedReceipts = unstable_cache(
  _fetchReceipts,
  ['receipts-list'],
  { revalidate: 30, tags: ['receipts'] }
)

export async function getReceipts(): Promise<ActionResponse<ReceiptWithItems[]>> {
  return _getCachedReceipts()
}

export async function deleteReceipt(id: string): Promise<ActionResponse<void>> {
  try {
    const repo = getReceiptRepository()

    const filePath = await repo.getFilePathById(id)
    await repo.delete(id)

    if (filePath) {
      await repo.removeFile(filePath)
    }

    invalidateCache(['/receipts', '/'])
    invalidateCacheTags(['receipts'])
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting receipt:', error)
    return { success: false, error: `Failed to delete receipt: ${error.message}` }
  }
}

export async function getReceiptFileUrl(path: string): Promise<ActionResponse<string>> {
  try {
    const repo = getReceiptRepository()
    const url = await repo.getSignedUrl(path)
    return { success: true, data: url }
  } catch (error: any) {
    console.error('Error creating signed URL for receipt:', error)
    return { success: false, error: 'Failed to get file access' }
  }
}

export async function updateReceipt(
  id: string,
  input: SaveReceiptInput
): Promise<ActionResponse<{ receiptId: string }>> {
  const { file, ...validationInput } = input
  const parsed = saveReceiptSchema.safeParse(validationInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const repo = getReceiptRepository()

    const receipt = await repo.update(id, {
      type: parsed.data.type,
      storeName: parsed.data.storeName,
      storeAddress: parsed.data.storeAddress ?? null,
      date: parsed.data.date,
      totalPrice: parsed.data.totalPrice,
      paymentMethod: parsed.data.paymentMethod ?? null,
      amountPaid: parsed.data.amountPaid ?? null,
      change: parsed.data.change ?? null,
      atmId: parsed.data.atmId ?? null,
      transactionType: parsed.data.transactionType ?? null,
      fee: parsed.data.fee ?? 0,
      bankStatementItemId: parsed.data.bankStatementItemId ?? null,
    })

    if (parsed.data.items && parsed.data.items.length >= 0) {
      await repo.deleteItemsByReceiptId(id)

      if (parsed.data.type === 'shopping' && parsed.data.items.length > 0) {
        const itemsToInsert = parsed.data.items.map((item) => ({
          receipt_id: id,
          product_name: item.productName,
          quantity: item.quantity,
          price: item.price,
        }))

        await repo.insertItems(itemsToInsert)
      }
    }

    invalidateCache(['/receipts'])
    invalidateCacheTags(['receipts'])
    return { success: true, data: { receiptId: id } }
  } catch (error: any) {
    console.error('Error updating receipt:', error)
    return { success: false, error: error.message || 'Database error occurred' }
  }
}
