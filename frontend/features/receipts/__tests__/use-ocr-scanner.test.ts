import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    vi.mocked(useScanStore).mockReturnValue(mockStore as any)
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

  it('runs handleProcessScan successfully', async () => {
    vi.mocked(scanDocumentWithAI).mockResolvedValue({ success: true, data: { merchant: 'Test Store' } } as any)

    const { result } = renderHook(() => useOcrScanner('Receipt'))

    await act(async () => {
      await result.current.handleProcessScan()
    })

    expect(mockStore.setScanStatus).toHaveBeenCalledWith('scanning')
    expect(scanDocumentWithAI).toHaveBeenCalled()
    expect(mockStore.setScanResult).toHaveBeenCalledWith({ merchant: 'Test Store' })
    expect(mockStore.setScanStatus).toHaveBeenCalledWith('success')
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
