'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Tables } from '@/lib/database.types'
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

  const supabase = await createClient()

  // 1. Upload file to Supabase Storage if file is provided
  let filePath: string | null = null
  if (file) {
    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const fileExt = file.name.split('.').pop() || 'jpg'
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const folder = parsed.data.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      filePath = `${folder}/${uniqueName}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, buffer, {
          contentType: file.type || 'image/jpeg',
          duplex: 'half'
        })

      if (uploadError) {
        console.error('Error uploading receipt file:', uploadError)
        return { success: false, error: `Failed to upload receipt file: ${uploadError.message}` }
      }
    } catch (err: any) {
      console.error('Exception during receipt upload:', err)
      return { success: false, error: `Upload error: ${err.message}` }
    }
  }

  // 2. Insert parent receipt
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
      file_path: filePath,
    })
    .select()
    .single()

  if (receiptError) {
    console.error('Error creating receipt record:', receiptError)
    if (filePath) {
      await supabase.storage.from('receipts').remove([filePath])
    }
    return { success: false, error: `Failed to save receipt: ${receiptError.message}` }
  }

  // 3. Insert items (only if it's a shopping receipt and items exist)
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
      if (filePath) {
        await supabase.storage.from('receipts').remove([filePath])
      }
      return { success: false, error: `Failed to save receipt items: ${itemsError.message}` }
    }
  }

  revalidatePath('/')
  return { success: true, data: { receiptId: receipt.id } }
}

export type ReceiptWithItems = Tables<'receipts'> & {
  receipts_items: Tables<'receipts_items'>[]
}

export async function getReceipts(): Promise<ActionResponse<ReceiptWithItems[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('receipts')
    .select(`
      *,
      receipts_items (*)
    `)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching receipts:', error)
    return { success: false, error: `Failed to fetch receipts: ${error.message}` }
  }

  return { success: true, data: data as ReceiptWithItems[] }
}

export async function deleteReceipt(id: string): Promise<ActionResponse<void>> {
  const supabase = await createClient()

  // 1. Fetch file_path from DB
  const { data: receipt, error: fetchError } = await supabase
    .from('receipts')
    .select('file_path')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching receipt for deletion:', fetchError)
    return { success: false, error: `Failed to find receipt: ${fetchError.message}` }
  }

  // 2. Delete DB record first (cascades items)
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting receipt:', error)
    return { success: false, error: `Failed to delete receipt: ${error.message}` }
  }

  // 3. Delete file from storage
  if (receipt?.file_path) {
    const { error: storageError } = await supabase.storage
      .from('receipts')
      .remove([receipt.file_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
    }
  }

  revalidatePath('/receipts')
  revalidatePath('/')
  return { success: true }
}

export async function getReceiptFileUrl(path: string): Promise<ActionResponse<string>> {
  const supabase = await createClient()
  
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 3600)

  if (error) {
    console.error('Error creating signed URL for receipt:', error)
    return { success: false, error: 'Failed to get file access' }
  }

  return { success: true, data: data.signedUrl }
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

  const supabase = await createClient()

  // 1. Update the parent receipt record in the receipts table
  const { data: receipt, error: receiptError } = await supabase
    .from('receipts')
    .update({
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
    .eq('id', id)
    .select()
    .single()

  if (receiptError) {
    console.error('Error updating receipt record:', receiptError)
    return { success: false, error: `Failed to update receipt: ${receiptError.message}` }
  }

  // 2. Handle items
  if (parsed.data.type === 'shopping') {
    // Delete existing items
    const { error: deleteError } = await supabase
      .from('receipts_items')
      .delete()
      .eq('receipt_id', id)

    if (deleteError) {
      console.error('Error deleting old receipt items:', deleteError)
      return { success: false, error: `Failed to clear old items: ${deleteError.message}` }
    }

    // Insert new items if any
    if (parsed.data.items && parsed.data.items.length > 0) {
      const itemsToInsert = parsed.data.items.map((item) => ({
        receipt_id: id,
        product_name: item.productName,
        quantity: item.quantity,
        price: item.price,
      }))

      const { error: itemsError } = await supabase
        .from('receipts_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Error inserting receipt items during update:', itemsError)
        return { success: false, error: `Failed to update receipt items: ${itemsError.message}` }
      }
    }
  } else {
    // If updated to atm type, remove any existing shopping items
    const { error: deleteError } = await supabase
      .from('receipts_items')
      .delete()
      .eq('receipt_id', id)

    if (deleteError) {
      console.error('Error removing receipt items for ATM type:', deleteError)
    }
  }

  revalidatePath('/receipts')
  return { success: true, data: { receiptId: id } }
}

