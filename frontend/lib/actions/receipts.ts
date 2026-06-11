'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ActionResponse } from './types'

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
  items: z.array(receiptItemSchema).optional().default([]),
})

export type SaveReceiptInput = z.infer<typeof saveReceiptSchema>

export async function saveReceipt(input: SaveReceiptInput): Promise<ActionResponse<{ receiptId: string }>> {
  const parsed = saveReceiptSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()

  // 1. Insert parent receipt
  const { data: receipt, error: receiptError } = await supabase
    .from('receipts')
    .insert({
      type: parsed.data.type,
      store_name: parsed.data.storeName,
      store_address: parsed.data.storeAddress || null,
      date: parsed.data.date,
      total_price: parsed.data.totalPrice,
      payment_method: parsed.data.paymentMethod || null,
      amount_paid: parsed.data.amountPaid ?? null,
      change: parsed.data.change ?? null,
      atm_id: parsed.data.atmId || null,
      transaction_type: parsed.data.transactionType || null,
      fee: parsed.data.fee ?? 0,
    })
    .select()
    .single()

  if (receiptError) {
    console.error('Error creating receipt record:', receiptError)
    return { success: false, error: `Failed to save receipt: ${receiptError.message}` }
  }

  // 2. Insert items (only if it's a shopping receipt and items exist)
  if (parsed.data.type === 'shopping' && parsed.data.items && parsed.data.items.length > 0) {
    const itemsToInsert = parsed.data.items.map(item => ({
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
      // Attempt cleanup of the parent receipt
      await supabase.from('receipts').delete().eq('id', receipt.id)
      return { success: false, error: `Failed to save receipt items: ${itemsError.message}` }
    }
  }

  revalidatePath('/')
  return { success: true, data: { receiptId: receipt.id } }
}
