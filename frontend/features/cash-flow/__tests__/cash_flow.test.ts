import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCashFlow, insertCashFlow, updateCashFlow, deleteCashFlow } from '../actions/cash_flow'
import { setCashFlowRepository, CashFlowRepository } from '@/lib/repositories/cash_flow'
import { Tables } from '@/lib/database.types'

// Mock next/cache
vi.mock('@/lib/cache', () => ({
  invalidateCache: vi.fn(),
}))

describe('cash_flow server actions', () => {
  let mockRepo: CashFlowRepository

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo = {
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
    setCashFlowRepository(mockRepo)
  })

  describe('getCashFlow', () => {
    it('returns empty array on database error', async () => {
      mockRepo.findAll = vi.fn().mockRejectedValue(new Error('DB connection lost'))
      const result = await getCashFlow()
      expect(result).toEqual([])
    })

    it('returns data on success', async () => {
      const data = [{ id: '1', description: 'coffee' }] as Tables<'cash_flow'>[]
      mockRepo.findAll = vi.fn().mockResolvedValue(data)
      const result = await getCashFlow()
      expect(result).toEqual(data)
    })
  })

  describe('insertCashFlow', () => {
    const validArgs = {
      date: '2026-06-19',
      income: 0,
      expense: 25000,
      main_category: 'Food',
      sub_category: 'Lunch',
      description: 'Rice package',
      payment_method: 'Cash',
      receipt_id: null,
    }

    it('fails validation when mandatory parameters are missing', async () => {
      const result = await insertCashFlow({} as any)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation failed')
    })

    it('returns success and data on successful insertion', async () => {
      const record = { id: 'inserted-id', ...validArgs } as Tables<'cash_flow'>
      mockRepo.create = vi.fn().mockResolvedValue(record)

      const result = await insertCashFlow(validArgs)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(record)
      }
    })



    it('returns error on insertion database failure', async () => {
      mockRepo.create = vi.fn().mockRejectedValue(new Error('Foreign key violation'))
      const result = await insertCashFlow(validArgs)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Foreign key violation')
    })

    it('uses fallback error message when error.message is falsy', async () => {
      mockRepo.create = vi.fn().mockRejectedValue({})
      const result = await insertCashFlow(validArgs)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error occurred')
    })
  })

  describe('updateCashFlow', () => {
    const validArgs = {
      date: '2026-06-19',
      income: 100,
      expense: 0,
      main_category: 'Refund',
      sub_category: '',
      description: 'Refunded coffee',
      payment_method: 'Gopay',
      receipt_id: null,
    }

    it('fails validation on invalid options', async () => {
      const result = await updateCashFlow('tx-1', { date: '' } as any)
      expect(result.success).toBe(false)
    })

    it('updates cash flow successfully', async () => {
      mockRepo.update = vi.fn().mockResolvedValue(undefined)
      const result = await updateCashFlow('tx-1', validArgs)
      expect(result.success).toBe(true)
    })

    it('returns error response on DB update failure', async () => {
      mockRepo.update = vi.fn().mockRejectedValue(new Error('Not Found'))
      const result = await updateCashFlow('tx-1', validArgs)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Not Found')
    })

    it('uses fallback error message when error.message is falsy', async () => {
      mockRepo.update = vi.fn().mockRejectedValue({})
      const result = await updateCashFlow('tx-1', validArgs)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error occurred')
    })
  })

  describe('deleteCashFlow', () => {
    it('deletes record successfully', async () => {
      mockRepo.delete = vi.fn().mockResolvedValue(undefined)
      const result = await deleteCashFlow('tx-1')
      expect(result.success).toBe(true)
    })

    it('returns error response on deletion failure', async () => {
      mockRepo.delete = vi.fn().mockRejectedValue(new Error('Permission Denied'))
      const result = await deleteCashFlow('tx-1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Permission Denied')
    })

    it('uses fallback error message when error.message is falsy', async () => {
      mockRepo.delete = vi.fn().mockRejectedValue({})
      const result = await deleteCashFlow('tx-1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error occurred')
    })
  })
})
