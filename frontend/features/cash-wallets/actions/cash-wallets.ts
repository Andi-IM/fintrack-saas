'use server'

import { z } from 'zod'
import { invalidateCache } from '@/lib/cache'
import { ActionResponse } from '@/lib/actions/types'
import { CashWallet, CashWalletWithBalance } from '@/lib/repositories/types'
import { getCashWalletRepository } from '@/lib/repositories/cash-wallets'

const cashWalletSchema = z.object({
  name: z.string().min(1, 'Nama dompet diperlukan'),
  currency: z.string().optional().default('IDR'),
  opening_balance: z.coerce.number().nonnegative('Saldo awal tidak boleh negatif').optional().default(0),
})

export type CashWalletInput = z.input<typeof cashWalletSchema>

const CACHE_PATHS = ['/cash-wallets', '/']

export async function getCashWallets(): Promise<CashWalletWithBalance[]> {
  try {
    const repo = getCashWalletRepository()
    return await repo.findAll()
  } catch (error: any) {
    console.error('Error fetching cash wallets:', error)
    return []
  }
}

export async function getCashWalletById(id: string): Promise<CashWallet | null> {
  try {
    const repo = getCashWalletRepository()
    return await repo.findById(id)
  } catch (error: any) {
    console.error('Error fetching cash wallet by id:', error)
    return null
  }
}

export async function insertCashWallet(input: CashWalletInput): Promise<ActionResponse<CashWallet>> {
  const parsed = cashWalletSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const repo = getCashWalletRepository()
    const inserted = await repo.create(parsed.data)
    invalidateCache(CACHE_PATHS)
    return { success: true, data: inserted }
  } catch (error: any) {
    console.error('Error inserting cash wallet:', error)
    if (error?.code === '23505') {
      return { success: false, error: 'Nama dompet sudah digunakan.' }
    }
    return { success: false, error: error.message || 'Database error occurred' }
  }
}

export async function updateCashWallet(id: string, input: CashWalletInput): Promise<ActionResponse<void>> {
  const parsed = cashWalletSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const repo = getCashWalletRepository()
    await repo.update(id, parsed.data)
    invalidateCache(CACHE_PATHS)
    return { success: true }
  } catch (error: any) {
    console.error('Error updating cash wallet:', error)
    if (error?.code === '23505') {
      return { success: false, error: 'Nama dompet sudah digunakan.' }
    }
    return { success: false, error: error.message || 'Database error occurred' }
  }
}

export async function deleteCashWallet(id: string): Promise<ActionResponse<void>> {
  try {
    const repo = getCashWalletRepository()
    await repo.delete(id)
    invalidateCache(CACHE_PATHS)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting cash wallet:', error)
    return { success: false, error: error.message || 'Database error occurred' }
  }
}
