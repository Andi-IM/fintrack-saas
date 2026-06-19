import { create } from 'zustand'
import { OCRResult } from '@/lib/ocr/types'

interface ScanState {
  fileToScan: File | null
  scanStatus: 'idle' | 'scanning' | 'success' | 'error'
  scanProgress: number
  scanResult: OCRResult | null
  errorMessage: string | null

  // Actions
  setFileToScan: (file: File | null) => void
  setScanStatus: (status: 'idle' | 'scanning' | 'success' | 'error') => void
  setScanProgress: (progress: number | ((prev: number) => number)) => void
  setScanResult: (result: OCRResult | null | ((prev: OCRResult | null) => OCRResult | null)) => void
  setErrorMessage: (message: string | null) => void
  resetScan: () => void
  updateScanResultItem: (index: number, field: string, value: string | number) => void
  deleteScanResultItem: (index: number) => void
  addScanResultItem: () => void
  updateScanResultField: (field: keyof OCRResult, value: string | number) => void
}

export const useScanStore = create<ScanState>((set) => ({
  fileToScan: null,
  scanStatus: 'idle',
  scanProgress: 0,
  scanResult: null,
  errorMessage: null,

  setFileToScan: (file) => set({ fileToScan: file }),
  setScanStatus: (status) => set({ scanStatus: status }),
  setScanProgress: (progress) =>
    set((state) => ({
      scanProgress: typeof progress === 'function' ? progress(state.scanProgress) : progress,
    })),
  setScanResult: (result) =>
    set((state) => ({
      scanResult: typeof result === 'function' ? result(state.scanResult) : result,
    })),
  setErrorMessage: (message) => set({ errorMessage: message }),
  resetScan: () =>
    set({
      fileToScan: null,
      scanStatus: 'idle',
      scanProgress: 0,
      scanResult: null,
      errorMessage: null,
    }),
  updateScanResultItem: (index, field, value) =>
    set((state) => {
      if (!state.scanResult || !state.scanResult.items) return {}
      const newItems = [...state.scanResult.items]
      newItems[index] = { ...newItems[index], [field]: value } as typeof newItems[number]
      return {
        scanResult: { ...state.scanResult, items: newItems },
      }
    }),
  deleteScanResultItem: (index) =>
    set((state) => {
      if (!state.scanResult || !state.scanResult.items) return {}
      const newItems = state.scanResult.items.filter((_, i) => i !== index)
      return {
        scanResult: { ...state.scanResult, items: newItems },
      }
    }),
  addScanResultItem: () =>
    set((state) => {
      if (!state.scanResult) return {}
      const newItem = { name: '', amount: 0, quantity: 1, price: 0 }
      const newItems = [...(state.scanResult.items || []), newItem]
      return {
        scanResult: { ...state.scanResult, items: newItems },
      }
    }),
  updateScanResultField: (field, value) =>
    set((state) => {
      if (!state.scanResult) return {}
      return {
        scanResult: { ...state.scanResult, [field]: value },
      }
    }),
}))
