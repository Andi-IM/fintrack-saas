import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useOcrScanner } from '../hooks/use-ocr-scanner'
import { useScanStore } from '../hooks/use-scan-store'
import { scanDocumentWithAI } from '../actions/ocr'

vi.mock('../hooks/use-scan-store', () => ({
  useScanStore: vi.fn()
}))

vi.mock('../actions/ocr', () => ({
  scanDocumentWithAI: vi.fn()
}))

describe('useOcrScanner', () => {
  const mockStore = {
    fileToScan: new File([''], 'test.jpg', { type: 'image/jpeg' }),
    setScanStatus: vi.fn(),
    setScanProgress: vi.fn(),
    setScanResult: vi.fn(),
    setErrorMessage: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.mocked(useScanStore).mockReturnValue(mockStore as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing if no fileToScan is set', async () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      fileToScan: null,
    } as any)

    const { result } = renderHook(() => useOcrScanner('Receipt'))

    await act(async () => {
      await result.current.handleProcessScan()
    })

    expect(mockStore.setScanStatus).not.toHaveBeenCalled()
  })

  it('runs handleProcessScan successfully and animates progress', async () => {
    // Mock scanDocumentWithAI to take time
    let resolveScan: (value: any) => void
    const scanPromise = new Promise(resolve => {
      resolveScan = resolve
    })
    vi.mocked(scanDocumentWithAI).mockReturnValue(scanPromise)
    // Mock setScanProgress to track calls
    let currentProgress = 0
    vi.mocked(mockStore.setScanProgress).mockImplementation(callback => {
      if (typeof callback === 'function') {
        currentProgress = callback(currentProgress)
      }
      return currentProgress
    })

    const { result } = renderHook(() => useOcrScanner('Receipt'))

    // Start processing
    let processPromise: Promise<void>
    await act(async () => {
      processPromise = result.current.handleProcessScan()
    })

    // Fast-forward time multiple times
    for (let i = 0; i < 20; i++) {
      act(() => {
        vi.advanceTimersByTime(150)
      })
    }

    // Verify progress reached up to 90
    expect(mockStore.setScanProgress).toHaveBeenCalled()
    expect(currentProgress).toBe(90)

    // Resolve the scan
    await act(async () => {
      resolveScan!({ success: true, data: { merchant: 'Test Store' } })
      await processPromise
    })

    expect(mockStore.setScanStatus).toHaveBeenCalledWith('scanning')
    expect(scanDocumentWithAI).toHaveBeenCalled()
    expect(mockStore.setScanResult).toHaveBeenCalledWith({ merchant: 'Test Store' })
    expect(mockStore.setScanStatus).toHaveBeenCalledWith('success')
    expect(mockStore.setScanProgress).toHaveBeenCalledWith(100)
  })

  it('handles scan failure', async () => {
    vi.mocked(scanDocumentWithAI).mockResolvedValue({ success: false, error: 'Failed to read document' } as any)

    const { result } = renderHook(() => useOcrScanner('Receipt'))

    await act(async () => {
      await result.current.handleProcessScan()
    })

    expect(mockStore.setScanStatus).toHaveBeenCalledWith('error')
    expect(mockStore.setErrorMessage).toHaveBeenCalledWith('Failed to read document')
  })

  it('handles exceptions in scanning process', async () => {
    vi.mocked(scanDocumentWithAI).mockRejectedValue(new Error('Network error') as any)

    const { result } = renderHook(() => useOcrScanner('Receipt'))

    await act(async () => {
      await result.current.handleProcessScan()
    })

    expect(mockStore.setScanStatus).toHaveBeenCalledWith('error')
    expect(mockStore.setErrorMessage).toHaveBeenCalledWith('Network error')
  })
})
