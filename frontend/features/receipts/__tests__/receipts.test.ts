import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/cached-user', () => ({
  getCachedUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

import { getCachedUser } from '@/lib/supabase/cached-user'
import {
  saveReceipt,
  getReceipts,
  deleteReceipt,
  getReceiptFileUrl,
  updateReceipt,
  SaveReceiptInput,
} from '../actions/receipts'
import { setReceiptRepository, ReceiptRepository } from '@/lib/repositories/receipts'
import { Tables } from '@/lib/database.types'

describe('receipts server actions', () => {
  let mockRepo: ReceiptRepository

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo = {
      save: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      insertItems: vi.fn(),
      deleteItemsByReceiptId: vi.fn(),
      getFilePathById: vi.fn(),
      getSignedUrl: vi.fn(),
      uploadFile: vi.fn(),
      removeFile: vi.fn(),
    } as any
    setReceiptRepository(mockRepo)
  })

  describe('saveReceipt', () => {
    const validInput: SaveReceiptInput = {
      storeName: 'Warung Makan',
      date: '2026-06-19',
      totalPrice: 50000,
      type: 'shopping',
      storeAddress: null,
      paymentMethod: 'Cash',
      amountPaid: 50000,
      change: 0,
      atmId: null,
      transactionType: null,
      fee: 0,
      bankStatementItemId: null,
      items: [],
      file: null,
    }

    it('returns validation error for missing required fields', async () => {
      const result = await saveReceipt({} as SaveReceiptInput)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation failed')
    })

    it('saves receipt successfully with items', async () => {
      const receipt = { id: 'rec-1', ...validInput, type: 'shopping' } as Tables<'receipts'>
      mockRepo.save = vi.fn().mockResolvedValue(receipt)

      const result = await saveReceipt({
        ...validInput,
        items: [{ productName: 'Nasi', quantity: 2, price: 15000 }],
      })

      expect(result.success).toBe(true)
      expect(result.data?.receiptId).toBe('rec-1')
      expect(mockRepo.save).toHaveBeenCalledTimes(1)
    })

    it('returns error when save throws', async () => {
      mockRepo.save = vi.fn().mockRejectedValue(new Error('Storage full'))

      const result = await saveReceipt(validInput)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage full')
    })

    it('uses fallback error message when error.message is falsy', async () => {
      mockRepo.save = vi.fn().mockRejectedValue({})
      const result = await saveReceipt(validInput)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error occurred')
    })
  })

  describe('getReceipts', () => {
    it('returns receipts on success', async () => {
      const receipts = [{ id: 'rec-1', store_name: 'Warung' }] as Tables<'receipts'>[]
      mockRepo.findAll = vi.fn().mockResolvedValue(receipts)

      const result = await getReceipts()
      expect(result.success).toBe(true)
      expect(result.data).toEqual(receipts)
    })

    it('returns error on failure', async () => {
      mockRepo.findAll = vi.fn().mockRejectedValue(new Error('DB error'))

      const result = await getReceipts()
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch receipts: DB error')
    })

    it('returns error when user is not authenticated', async () => {
      vi.mocked(getCachedUser).mockResolvedValueOnce(null)
      const result = await getReceipts()
      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })
  })

  describe('deleteReceipt', () => {
    it('deletes receipt successfully', async () => {
      mockRepo.getFilePathById = vi.fn().mockResolvedValue('path/to/file.jpg')
      mockRepo.delete = vi.fn().mockResolvedValue(undefined)
      mockRepo.removeFile = vi.fn().mockResolvedValue(undefined)

      const result = await deleteReceipt('rec-1')
      expect(result.success).toBe(true)
      expect(mockRepo.delete).toHaveBeenCalledWith('rec-1')
      expect(mockRepo.removeFile).toHaveBeenCalledWith('path/to/file.jpg')
    })

    it('deletes receipt successfully without file', async () => {
      mockRepo.getFilePathById = vi.fn().mockResolvedValue(null)
      mockRepo.delete = vi.fn().mockResolvedValue(undefined)
      mockRepo.removeFile = vi.fn().mockResolvedValue(undefined)

      const result = await deleteReceipt('rec-1')
      expect(result.success).toBe(true)
      expect(mockRepo.delete).toHaveBeenCalledWith('rec-1')
      expect(mockRepo.removeFile).not.toHaveBeenCalled()
    })

    it('returns error on delete failure', async () => {
      mockRepo.getFilePathById = vi.fn().mockResolvedValue(null)
      mockRepo.delete = vi.fn().mockRejectedValue(new Error('Delete failed'))

      const result = await deleteReceipt('rec-1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to delete receipt: Delete failed')
    })
  })

  describe('getReceiptFileUrl', () => {
    it('returns signed URL', async () => {
      mockRepo.getSignedUrl = vi.fn().mockResolvedValue('https://signed-url')

      const result = await getReceiptFileUrl('path/to/file.jpg')
      expect(result.success).toBe(true)
      expect(result.data).toBe('https://signed-url')
    })

    it('returns error on failure', async () => {
      mockRepo.getSignedUrl = vi.fn().mockRejectedValue(new Error('Signed URL failed'))

      const result = await getReceiptFileUrl('path/to/file.jpg')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to get file access')
    })
  })

  describe('updateReceipt', () => {
    it('returns validation error for missing required fields', async () => {
      const result = await updateReceipt('rec-1', {} as SaveReceiptInput)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation failed')
    })

    it('updates receipt successfully', async () => {
      const updated = { id: 'rec-1', store_name: 'Updated Store' } as Tables<'receipts'>
      mockRepo.update = vi.fn().mockResolvedValue(updated)
      mockRepo.deleteItemsByReceiptId = vi.fn().mockResolvedValue(undefined)

      const input: SaveReceiptInput = {
        storeName: 'Updated Store',
        date: '2026-06-19',
        totalPrice: 60000,
        type: 'shopping',
        items: [],
        file: null,
      }

      const result = await updateReceipt('rec-1', input)
      expect(result.success).toBe(true)
      expect(result.data?.receiptId).toBe('rec-1')
    })

    it('updates receipt and inserts items when type is shopping and items exist', async () => {
      const updated = { id: 'rec-1', store_name: 'Updated Store' } as Tables<'receipts'>
      mockRepo.update = vi.fn().mockResolvedValue(updated)
      mockRepo.deleteItemsByReceiptId = vi.fn().mockResolvedValue(undefined)
      mockRepo.insertItems = vi.fn().mockResolvedValue(undefined)

      const input: SaveReceiptInput = {
        storeName: 'Updated Store',
        date: '2026-06-19',
        totalPrice: 60000,
        type: 'shopping',
        items: [{ productName: 'Es Teh', quantity: 1, price: 5000 }],
        file: null,
      }

      const result = await updateReceipt('rec-1', input)
      expect(result.success).toBe(true)
      expect(mockRepo.deleteItemsByReceiptId).toHaveBeenCalledWith('rec-1')
      expect(mockRepo.insertItems).toHaveBeenCalledWith([{
        receipt_id: 'rec-1',
        product_name: 'Es Teh',
        quantity: 1,
        price: 5000
      }])
    })

    it('returns error on update failure', async () => {
      mockRepo.update = vi.fn().mockRejectedValue(new Error('Update failed'))

      const input: SaveReceiptInput = {
        storeName: 'Store',
        date: '2026-06-19',
        totalPrice: 60000,
        type: 'shopping',
        items: [],
        file: null,
      }

      const result = await updateReceipt('rec-1', input)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })

    it('uses fallback error message when update throws an empty error object', async () => {
      mockRepo.update = vi.fn().mockRejectedValue({})
      
      const input: SaveReceiptInput = {
        storeName: 'Store',
        date: '2026-06-19',
        totalPrice: 60000,
        type: 'shopping',
        items: [],
        file: null,
      }

      const result = await updateReceipt('rec-1', input)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error occurred')
    })
  })
})
