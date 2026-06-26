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


})
