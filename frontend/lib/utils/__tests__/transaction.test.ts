import { describe, it, expect } from 'vitest'
import { formatCurrency, filterTransactionsByRange } from '@/lib/utils/transaction'
import { Tables } from '@/lib/database.types'

describe('transaction utils', () => {
  describe('formatCurrency', () => {
    it('formats numbers to IDR currency representation', () => {
      expect(formatCurrency(25000)).toMatch(/Rp\s*25\.000/)
      expect(formatCurrency(10000000)).toMatch(/Rp\s*10\.000\.000/)
    })
  })

  describe('filterTransactionsByRange', () => {
    const now = new Date()
    
    const createTx = (daysAgo: number): Tables<'cash_flow'> => {
      const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      return {
        id: `tx-${daysAgo}`,
        created_at: date.toISOString(),
        date: date.toISOString(),
        description: `Tx ${daysAgo} days ago`,
        income: 1000,
        expense: 0,
        main_category: 'Other',
        sub_category: null,
        payment_method: 'Cash',
        receipt_id: null,
        source_item_id: null,
      }
    }

    const transactions = [
      createTx(2),   // 2 days ago (within 1W)
      createTx(15),  // 15 days ago (within 1M, outside 1W)
      createTx(45),  // 45 days ago (within 3M, outside 1M)
      createTx(120), // 120 days ago (within 1Y, outside 3M)
      createTx(400)  // 400 days ago (outside all)
    ]

    it('filters correctly for ALL range', () => {
      const result = filterTransactionsByRange(transactions, 'ALL')
      expect(result.length).toBe(5)
    })

    it('filters correctly for 1W range', () => {
      const result = filterTransactionsByRange(transactions, '1W')
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('tx-2')
    })

    it('filters correctly for 1M range', () => {
      const result = filterTransactionsByRange(transactions, '1M')
      expect(result.length).toBe(2)
      expect(result.map(t => t.id)).toContain('tx-2')
      expect(result.map(t => t.id)).toContain('tx-15')
    })

    it('filters correctly for 3M range', () => {
      const result = filterTransactionsByRange(transactions, '3M')
      expect(result.length).toBe(3)
    })

    it('filters correctly for 1Y range', () => {
      const result = filterTransactionsByRange(transactions, '1Y')
      expect(result.length).toBe(4)
    })
  })
})
