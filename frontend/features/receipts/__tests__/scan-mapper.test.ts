import { describe, it, expect } from 'vitest'
import { mapReceiptResultToPayload, mapBankStatementResultToPayload, isReceiptItem, isBankTransaction } from '@/features/receipts/utils/scan-mapper'
import { OCRResult, ReceiptItem, BankTransaction } from '@/lib/ocr/types'

describe('scan-mapper utilities', () => {
  const fakeFile = new File([''], 'test.jpg', { type: 'image/jpeg' })

  describe('isReceiptItem', () => {
    it('returns true for ReceiptItem and false for BankTransaction', () => {
      const receiptItem: ReceiptItem = { name: 'Item A', amount: 1000 }
      const bankItem: BankTransaction = { name: 'Transfer', amount: 1000, date: '2026-06-19', type: 'income', category: 'General', bank: 'BCA' }

      expect(isReceiptItem(receiptItem)).toBe(true)
      expect(isReceiptItem(bankItem)).toBe(false)
    })
  })

  describe('isBankTransaction', () => {
    it('returns true for BankTransaction and false for ReceiptItem', () => {
      const receiptItem: ReceiptItem = { name: 'Item A', amount: 1000 }
      const bankItem: BankTransaction = { name: 'Transfer', amount: 1000, date: '2026-06-19', type: 'income', category: 'General', bank: 'BCA' }

      expect(isBankTransaction(receiptItem)).toBe(false)
      expect(isBankTransaction(bankItem)).toBe(true)
    })
  })

  describe('mapReceiptResultToPayload', () => {
    it('maps OCRResult to SaveReceiptInput correctly with default values', () => {
      const scanResult: OCRResult = {
        merchant: 'Test Store',
        total: 15000,
        items: [
          { name: 'Roti', amount: 15000 }
        ]
      }

      const payload = mapReceiptResultToPayload(scanResult, fakeFile)

      expect(payload.storeName).toBe('Test Store')
      expect(payload.totalPrice).toBe(15000)
      expect(payload.items).toHaveLength(1)
      expect(payload.items[0]).toEqual({ productName: 'Roti', quantity: 1, price: 15000 })
      expect(payload.file).toBe(fakeFile)
    })

    it('uses fallback values when optional fields are missing', () => {
      const scanResult: OCRResult = {}
      const payload = mapReceiptResultToPayload(scanResult, fakeFile)

      expect(payload.storeName).toBe('Unknown Merchant')
      expect(payload.totalPrice).toBe(0)
      expect(payload.paymentMethod).toBe('Cash')
      expect(payload.items).toEqual([])
    })
  })

  describe('mapBankStatementResultToPayload', () => {
    it('maps OCRResult to SaveBankStatementInput correctly with default values', () => {
      const scanResult: OCRResult = {
        bank: 'BCA',
        statementPeriod: 'June 2026',
        openingBalance: 100000,
        closingBalance: 150000,
        items: [
          { name: 'Transfer In', amount: 50000, date: '2026-06-19', type: 'income', category: 'Transfer', bank: 'BCA' }
        ]
      }

      const payload = mapBankStatementResultToPayload(scanResult, fakeFile)

      expect(payload.bankName).toBe('BCA')
      expect(payload.statementPeriod).toBe('01/06/2026')
      expect(payload.openingBalance).toBe(100000)
      expect(payload.closingBalance).toBe(150000)
      expect(payload.items).toHaveLength(1)
      expect(payload.file).toBe(fakeFile)
    })

    it('uses fallback values for bank statement', () => {
      const scanResult: OCRResult = {}
      const payload = mapBankStatementResultToPayload(scanResult, fakeFile)

      expect(payload.bankName).toBe('Unknown Bank')
      expect(payload.statementPeriod).toBe('Unknown Period')
      expect(payload.items).toEqual([])
    })

    it('normalizes Indonesian AI period labels to first-day date input format', () => {
      const scanResult: OCRResult = {
        bank: 'BCA',
        statementPeriod: 'Agustus 2021',
        items: []
      }

      const payload = mapBankStatementResultToPayload(scanResult, fakeFile)

      expect(payload.statementPeriod).toBe('01/08/2021')
    })
  })
})
