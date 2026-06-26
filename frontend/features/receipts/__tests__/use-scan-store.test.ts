import { describe, it, expect, beforeEach } from 'vitest'
import { useScanStore } from '@/features/receipts/hooks/use-scan-store'
import { OCRResult } from '@/lib/ocr/types'

describe('useScanStore', () => {
  beforeEach(() => {
    useScanStore.getState().resetScan()
  })

  it('initializes with default values', () => {
    const state = useScanStore.getState()
    expect(state.fileToScan).toBeNull()
    expect(state.scanStatus).toBe('idle')
    expect(state.scanProgress).toBe(0)
    expect(state.scanResult).toBeNull()
    expect(state.errorMessage).toBeNull()
  })

  it('sets fileToScan', () => {
    const file = new File([''], 'receipt.jpg', { type: 'image/jpeg' })
    useScanStore.getState().setFileToScan(file)
    expect(useScanStore.getState().fileToScan).toBe(file)
  })

  it('sets scanStatus', () => {
    useScanStore.getState().setScanStatus('scanning')
    expect(useScanStore.getState().scanStatus).toBe('scanning')
  })

  it('sets scanProgress with value and updater function', () => {
    useScanStore.getState().setScanProgress(50)
    expect(useScanStore.getState().scanProgress).toBe(50)

    useScanStore.getState().setScanProgress((prev) => prev + 10)
    expect(useScanStore.getState().scanProgress).toBe(60)
  })

  it('sets scanResult with value and updater function', () => {
    const mockResult: OCRResult = { date: '2026-06-19', merchant: 'Test' }
    useScanStore.getState().setScanResult(mockResult)
    expect(useScanStore.getState().scanResult).toEqual(mockResult)

    useScanStore.getState().setScanResult((prev) => prev ? { ...prev, merchant: 'Updated' } : null)
    expect(useScanStore.getState().scanResult?.merchant).toBe('Updated')
  })

  it('sets errorMessage', () => {
    useScanStore.getState().setErrorMessage('Failed to read document')
    expect(useScanStore.getState().errorMessage).toBe('Failed to read document')
  })

  it('resets scan store', () => {
    const file = new File([''], 'receipt.jpg', { type: 'image/jpeg' })
    useScanStore.getState().setFileToScan(file)
    useScanStore.getState().setScanStatus('success')
    useScanStore.getState().setScanProgress(100)
    useScanStore.getState().setErrorMessage('None')

    useScanStore.getState().resetScan()

    const state = useScanStore.getState()
    expect(state.fileToScan).toBeNull()
    expect(state.scanStatus).toBe('idle')
    expect(state.scanProgress).toBe(0)
    expect(state.errorMessage).toBeNull()
  })

  describe('result item manipulation', () => {
    beforeEach(() => {
      const initialResult: OCRResult = {
        date: '2026-06-19',
        merchant: 'Test Store',
        items: [
          { name: 'Apples', amount: 30000, quantity: 2, price: 15000 },
          { name: 'Bananas', amount: 20000, quantity: 1, price: 20000 },
        ],
      }
      useScanStore.getState().setScanResult(initialResult)
    })

    it('updates scan result item field', () => {
      useScanStore.getState().updateScanResultItem(0, 'name', 'Red Apples')
      expect(useScanStore.getState().scanResult?.items?.[0].name).toBe('Red Apples')
    })

    it('returns empty object if no scanResult exists when updating items', () => {
      useScanStore.getState().resetScan()
      useScanStore.getState().updateScanResultItem(0, 'name', 'Red Apples')
      expect(useScanStore.getState().scanResult).toBeNull()
    })

    it('deletes scan result item', () => {
      useScanStore.getState().deleteScanResultItem(0)
      expect(useScanStore.getState().scanResult?.items).toHaveLength(1)
      expect(useScanStore.getState().scanResult?.items?.[0].name).toBe('Bananas')
    })

    it('returns empty object if no scanResult exists when deleting items', () => {
      useScanStore.getState().resetScan()
      useScanStore.getState().deleteScanResultItem(0)
      expect(useScanStore.getState().scanResult).toBeNull()
    })

    it('adds scan result item', () => {
      useScanStore.getState().addScanResultItem()
      const items = useScanStore.getState().scanResult?.items
      expect(items).toHaveLength(3)
      expect(items?.[2]).toEqual({ name: '', amount: 0, quantity: 1, price: 0 })
    })

    it('returns empty object if no scanResult exists when adding items', () => {
      useScanStore.getState().resetScan()
      useScanStore.getState().addScanResultItem()
      expect(useScanStore.getState().scanResult).toBeNull()
    })

    it('updates general scan result field', () => {
      useScanStore.getState().updateScanResultField('merchant', 'Supermarket')
      expect(useScanStore.getState().scanResult?.merchant).toBe('Supermarket')
    })

    it('returns empty object if no scanResult exists when updating general fields', () => {
      useScanStore.getState().resetScan()
      useScanStore.getState().updateScanResultField('merchant', 'Supermarket')
      expect(useScanStore.getState().scanResult).toBeNull()
    })
  })
})
