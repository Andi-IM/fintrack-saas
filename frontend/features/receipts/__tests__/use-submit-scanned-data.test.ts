import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSubmitScannedData } from '../hooks/use-submit-scanned-data'
import { useScanStore } from '../hooks/use-scan-store'
import { saveReceipt } from '@/features/receipts/actions/receipts'
import { saveBankStatement } from '@/features/bank-statements/actions/statements'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

vi.mock('../hooks/use-scan-store', () => ({
  useScanStore: vi.fn()
}))

vi.mock('@/features/receipts/actions/receipts', () => ({
  saveReceipt: vi.fn(),
}))

vi.mock('@/features/bank-statements/actions/statements', () => ({
  saveBankStatement: vi.fn(),
}))

describe('useSubmitScannedData', () => {
  const mockStore = {
    fileToScan: new File([''], 'receipt.jpg', { type: 'image/jpeg' }),
    scanResult: { merchant: 'Alfamart', total: 10000 },
    setScanStatus: vi.fn(),
    setErrorMessage: vi.fn(),
    resetScan: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useScanStore).mockReturnValue(mockStore as any)
  })

  it('does nothing if no fileToScan or scanResult is set', async () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      fileToScan: null,
    } as any)

    const { result } = renderHook(() => useSubmitScannedData('Receipt'))

    await act(async () => {
      await result.current.handleSaveScannedItems()
    })

    expect(saveReceipt).not.toHaveBeenCalled()
  })

  it('submits Receipt successfully', async () => {
    vi.mocked(saveReceipt).mockResolvedValue({ success: true } as any)

    const { result } = renderHook(() => useSubmitScannedData('Receipt'))

    await act(async () => {
      await result.current.handleSaveScannedItems()
    })

    expect(saveReceipt).toHaveBeenCalled()
    expect(mockStore.resetScan).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('handles Receipt save failure', async () => {
    vi.mocked(saveReceipt).mockResolvedValue({ success: false, error: 'Database crash' } as any)

    const { result } = renderHook(() => useSubmitScannedData('Receipt'))

    await act(async () => {
      await result.current.handleSaveScannedItems()
    })

    expect(saveReceipt).toHaveBeenCalled()
    expect(mockStore.setScanStatus).toHaveBeenCalledWith('error')
    expect(mockStore.setErrorMessage).toHaveBeenCalledWith('Database crash')
  })

  it('submits BankStatement successfully', async () => {
    vi.mocked(saveBankStatement).mockResolvedValue({ success: true } as any)

    const { result } = renderHook(() => useSubmitScannedData('BankStatement'))

    await act(async () => {
      await result.current.handleSaveScannedItems()
    })

    expect(saveBankStatement).toHaveBeenCalled()
    expect(mockStore.resetScan).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('handles BankStatement save failure', async () => {
    vi.mocked(saveBankStatement).mockResolvedValue({ success: false, error: 'Statement save failed' } as any)

    const { result } = renderHook(() => useSubmitScannedData('BankStatement'))

    await act(async () => {
      await result.current.handleSaveScannedItems()
    })

    expect(saveBankStatement).toHaveBeenCalled()
    expect(mockStore.setScanStatus).toHaveBeenCalledWith('error')
    expect(mockStore.setErrorMessage).toHaveBeenCalledWith('Statement save failed')
  })

  it('handles unexpected exceptions during save', async () => {
    vi.mocked(saveReceipt).mockRejectedValue(new Error('Unexpected network error') as any)

    const { result } = renderHook(() => useSubmitScannedData('Receipt'))

    await act(async () => {
      await result.current.handleSaveScannedItems()
    })

    expect(mockStore.setScanStatus).toHaveBeenCalledWith('error')
    expect(mockStore.setErrorMessage).toHaveBeenCalledWith('Unexpected network error')
  })
})
