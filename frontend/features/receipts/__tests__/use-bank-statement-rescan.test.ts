import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBankStatementRescan } from '@/features/receipts/hooks/use-bank-statement-rescan'
import { useScanStore } from '@/features/receipts/hooks/use-scan-store'
import { reparseBankStatementWithAI } from '@/features/receipts/actions/ocr'

vi.mock('../hooks/use-scan-store', () => ({
  useScanStore: vi.fn()
}))

vi.mock('../actions/ocr', () => ({
  reparseBankStatementWithAI: vi.fn()
}))

vi.mock('@/lib/utils/date', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/date')>('@/lib/utils/date')
  return {
    ...actual,
    getBrowserTimezoneOffset: vi.fn(() => '+07:00'),
  }
})

describe('useBankStatementRescan', () => {
  const mockStore = {
    fileToScan: new File(['statement'], 'statement.pdf', { type: 'application/pdf' }),
    scanResult: {
      rawText: 'raw OCR from Modal',
      bank: 'Bank Jago',
      statementPeriod: '01/08/2021',
      items: [],
    },
    setScanResult: vi.fn(),
    setErrorMessage: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useScanStore).mockReturnValue(mockStore as any)
    vi.mocked(useScanStore).getState = vi.fn(() => mockStore as any)
  })

  it('re-parses from raw OCR text and current parsed JSON without re-uploading the file', async () => {
    vi.mocked(reparseBankStatementWithAI).mockResolvedValue({
      success: true,
      data: {
        bank: 'Bank Jago',
        statementPeriod: '01/08/2021',
        items: [{ date: '2021-08-02T00:00:00+07:00', name: 'Corrected transfer', amount: 50000, type: 'income', category: 'Transfer', bank: 'Bank Jago' }],
      },
    })

    const { result } = renderHook(() => useBankStatementRescan())

    await act(async () => {
      await result.current.handleReparseBankStatement()
    })

    expect(reparseBankStatementWithAI).toHaveBeenCalledWith({
      rawText: 'raw OCR from Modal',
      currentResult: mockStore.scanResult,
      timezoneOffset: '+07:00',
      filename: 'statement.pdf',
    })
    expect(mockStore.setScanResult).toHaveBeenCalledWith(expect.objectContaining({
      rawText: 'raw OCR from Modal',
      bank: 'Bank Jago',
    }))
  })

  it('does not overwrite newer review edits with a stale successful re-scan response', async () => {
    vi.mocked(useScanStore).getState = vi.fn(() => ({
      ...mockStore,
      scanResult: {
        ...mockStore.scanResult,
        bank: 'Edited Bank Jago',
      },
    }) as any)
    vi.mocked(reparseBankStatementWithAI).mockResolvedValue({
      success: true,
      data: {
        bank: 'Bank Jago',
        statementPeriod: '01/08/2021',
        items: [{ date: '2021-08-02T00:00:00+07:00', name: 'Corrected transfer', amount: 50000, type: 'income', category: 'Transfer', bank: 'Bank Jago' }],
      },
    })

    const { result } = renderHook(() => useBankStatementRescan())

    await act(async () => {
      await result.current.handleReparseBankStatement()
    })

    expect(mockStore.setScanResult).not.toHaveBeenCalled()
  })

  it('rejects re-scan when raw OCR text is unavailable', async () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: { bank: 'Bank Jago', items: [] },
    } as any)

    const { result } = renderHook(() => useBankStatementRescan())

    await act(async () => {
      await result.current.handleReparseBankStatement()
    })

    expect(reparseBankStatementWithAI).not.toHaveBeenCalled()
    expect(mockStore.setErrorMessage).toHaveBeenCalledWith('Raw OCR text is unavailable. Upload the statement again before re-scanning.')
  })
})
