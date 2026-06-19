import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ScanDialog } from '../components/ScanDialog'
import { useScanStore } from '../hooks/use-scan-store'
import { ScanProgressIndicator } from '../components/ScanProgressIndicator'
import React from 'react'

// Mock next router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock API actions
vi.mock('@/features/receipts/actions/receipts', () => ({
  saveReceipt: vi.fn(),
}))
vi.mock('@/features/receipts/actions/ocr', () => ({
  scanDocumentWithAI: vi.fn(),
}))
vi.mock('@/features/bank-statements/actions/statements', () => ({
  saveBankStatement: vi.fn(),
}))
vi.mock('@/lib/ocr/compress-image', () => ({
  compressImageIfNeeded: vi.fn((file) => Promise.resolve(file)),
}))

// Mock Zustand store
vi.mock('@/features/receipts/hooks/use-scan-store', () => ({
  useScanStore: vi.fn(),
}))

describe('ScanDialog Component', () => {
  const mockStore = {
    fileToScan: null,
    scanStatus: 'idle',
    scanProgress: 0,
    scanResult: null,
    errorMessage: '',
    setFileToScan: vi.fn(),
    setScanStatus: vi.fn(),
    setScanProgress: vi.fn(),
    setScanResult: vi.fn(),
    setErrorMessage: vi.fn(),
    resetScan: vi.fn(),
    updateScanResultItem: vi.fn(),
    deleteScanResultItem: vi.fn(),
    addScanResultItem: vi.fn(),
    updateScanResultField: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useScanStore).mockReturnValue(mockStore as any)
  })

  it('renders correctly in Receipt mode when idle', () => {
    render(<ScanDialog scanContext="Receipt" />)
    
    expect(screen.getByText('Smart Receipt Scanner')).toBeInTheDocument()
    expect(screen.getByText(/Drag & drop your receipt image here/i)).toBeInTheDocument()
  })

  it('renders correctly in BankStatement mode when idle', () => {
    render(<ScanDialog scanContext="BankStatement" />)
    
    expect(screen.getByText('Bank Statement AI')).toBeInTheDocument()
    expect(screen.getByText(/Drag & drop your PDF statement here/i)).toBeInTheDocument()
  })

  it('shows file ready to scan when file is selected', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      fileToScan: new File([''], 'test-receipt.jpg', { type: 'image/jpeg' }),
      scanStatus: 'idle'
    } as any)

    render(<ScanDialog scanContext="Receipt" />)
    
    expect(screen.getByText('test-receipt.jpg')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Extract with AI/i })).toBeInTheDocument()
  })

  it('shows scanning progress', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      fileToScan: new File([''], 'test-receipt.jpg', { type: 'image/jpeg' }),
      scanStatus: 'scanning',
      scanProgress: 45
    } as any)

    render(<ScanDialog scanContext="Receipt" />)
    
    expect(screen.getByText('Analyzing Document...')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('shows error state and allows retry', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      fileToScan: new File([''], 'test-receipt.jpg', { type: 'image/jpeg' }),
      scanStatus: 'error',
      errorMessage: 'Failed to extract text'
    } as any)

    render(<ScanDialog scanContext="Receipt" />)
    
    expect(screen.getByText('Processing Failed')).toBeInTheDocument()
    expect(screen.getByText('Failed to extract text')).toBeInTheDocument()
    
    const retryBtn = screen.getByRole('button', { name: /Try Again/i })
    fireEvent.click(retryBtn)
    expect(mockStore.setScanStatus).toHaveBeenCalledWith('idle')
  })

  it('shows success state and allows editing for Receipt', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      fileToScan: new File([''], 'test-receipt.jpg', { type: 'image/jpeg' }),
      scanStatus: 'success',
      scanResult: {
        merchant: 'Indomaret',
        total: 50000,
        type: 'shopping',
        items: [
          { name: 'Roti', amount: 15000 },
          { name: 'Susu', amount: 35000 }
        ]
      }
    } as any)

    render(<ScanDialog scanContext="Receipt" />)
    
    expect(screen.getByText('Extraction Successful - Review & Edit')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Indomaret')).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('50000').length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue('Roti')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Susu')).toBeInTheDocument()
  })

  it('triggers handleProcessScan correctly', async () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      fileToScan: new File(['fake data'], 'test.pdf', { type: 'application/pdf' }),
      scanStatus: 'idle'
    } as any)

    const { scanDocumentWithAI } = await import('@/features/receipts/actions/ocr')
    vi.mocked(scanDocumentWithAI).mockResolvedValue({
      success: true,
      data: { merchant: 'Test Merchant', total: 100 }
    } as any)

    render(<ScanDialog scanContext="BankStatement" />)
    
    const extractBtn = screen.getByRole('button', { name: /Extract with AI/i })
    fireEvent.click(extractBtn)

    expect(mockStore.setScanStatus).toHaveBeenCalledWith('scanning')
    expect(scanDocumentWithAI).toHaveBeenCalled()
  })

  it('triggers handleSaveScannedItems for Receipt', async () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      fileToScan: new File([''], 'receipt.jpg', { type: 'image/jpeg' }),
      scanStatus: 'success',
      scanResult: {
        merchant: 'Alfamart',
        total: 10000,
        type: 'shopping',
        items: []
      }
    } as any)

    const { saveReceipt } = await import('@/features/receipts/actions/receipts')
    vi.mocked(saveReceipt).mockResolvedValue({ success: true, data: undefined } as any)

    render(<ScanDialog scanContext="Receipt" />)
    
    const saveBtn = screen.getByRole('button', { name: /Confirm & Save/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(saveReceipt).toHaveBeenCalled()
      expect(mockStore.resetScan).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('triggers handleSaveScannedItems for BankStatement', async () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      fileToScan: new File([''], 'statement.pdf', { type: 'application/pdf' }),
      scanStatus: 'success',
      scanResult: {
        bank: 'BCA',
        statementPeriod: 'May 2026',
        openingBalance: 100,
        closingBalance: 200,
        items: []
      }
    } as any)

    const { saveBankStatement } = await import('@/features/bank-statements/actions/statements')
    vi.mocked(saveBankStatement).mockResolvedValue({ success: true, data: undefined } as any)

    render(<ScanDialog scanContext="BankStatement" />)
    
    const saveBtn = screen.getByRole('button', { name: /Confirm & Save/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(saveBankStatement).toHaveBeenCalled()
      expect(mockStore.resetScan).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('allows adding and deleting items in Receipt mode', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      fileToScan: new File([''], 'receipt.jpg', { type: 'image/jpeg' }),
      scanStatus: 'success',
      scanResult: {
        merchant: 'Alfamart',
        total: 10000,
        type: 'shopping',
        items: [
          { name: 'Item 1', amount: 5000 }
        ]
      }
    } as any)

    render(<ScanDialog scanContext="Receipt" />)
    
    // Add item
    const addBtn = screen.getByRole('button', { name: /Tambah Item/i })
    fireEvent.click(addBtn)
    expect(mockStore.addScanResultItem).toHaveBeenCalled()

    // Delete item
    const deleteBtn = screen.getByRole('button', { name: /Hapus item ini/i })
    fireEvent.click(deleteBtn)
    expect(mockStore.deleteScanResultItem).toHaveBeenCalledWith(0)
  })

  it('renders BankStatement success state and allows editing fields', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      fileToScan: new File([''], 'statement.pdf', { type: 'application/pdf' }),
      scanStatus: 'success',
      scanResult: {
        bank: 'BCA',
        statementPeriod: 'May 2026',
        openingBalance: 100,
        closingBalance: 200,
        items: [
          { name: 'Transfer in', amount: 100, type: 'income', date: '2026-05-01T10:00:00Z' }
        ]
      }
    } as any)

    render(<ScanDialog scanContext="BankStatement" />)
    
    expect(screen.getByDisplayValue('BCA')).toBeInTheDocument()
    expect(screen.getByDisplayValue('May 2026')).toBeInTheDocument()
    
    // Edit bank name
    const bankInput = screen.getByDisplayValue('BCA')
    fireEvent.change(bankInput, { target: { value: 'BCA Syariah' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('bank', 'BCA Syariah')

    // Edit item name
    const itemNameInput = screen.getByDisplayValue('Transfer in')
    fireEvent.change(itemNameInput, { target: { value: 'Salary' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'name', 'Salary')
  })

  it('handles drop/select file correctly', async () => {
    render(<ScanDialog scanContext="Receipt" />)
    const file = new File(['hello'], 'hello.png', { type: 'image/png' })
    const inputEl = document.querySelector('input[type="file"]')!
    Object.defineProperty(inputEl, 'files', {
      value: [file]
    })
    fireEvent.change(inputEl)
    
    await waitFor(() => {
      expect(mockStore.setFileToScan).toHaveBeenCalledWith(file)
      expect(mockStore.setScanStatus).toHaveBeenCalledWith('idle')
    })
  })

  it('rejects PDF file larger than 1MB', async () => {
    render(<ScanDialog scanContext="Receipt" />)
    const file = new File(['a'.repeat(1024 * 1024 + 1)], 'hello.pdf', { type: 'application/pdf' })
    const inputEl = document.querySelector('input[type="file"]')!
    Object.defineProperty(inputEl, 'files', {
      value: [file]
    })
    fireEvent.change(inputEl)
    
    await waitFor(() => {
      expect(mockStore.setErrorMessage).toHaveBeenCalledWith('File size exceeds the 1MB limit for PDFs.')
      expect(mockStore.setScanStatus).toHaveBeenCalledWith('error')
    })
  })

  it('compresses non-PDF file larger than 1MB', async () => {
    const { compressImageIfNeeded } = await import('@/lib/ocr/compress-image')
    render(<ScanDialog scanContext="Receipt" />)
    const file = new File(['a'.repeat(1024 * 1024 + 1)], 'large-image.png', { type: 'image/png' })
    const inputEl = document.querySelector('input[type="file"]')!
    Object.defineProperty(inputEl, 'files', {
      value: [file]
    })
    fireEvent.change(inputEl)
    
    await waitFor(() => {
      expect(compressImageIfNeeded).toHaveBeenCalledWith(file)
      expect(mockStore.setFileToScan).toHaveBeenCalled()
    })
  })

  it('calls setFileToScan(null) when Remove button is clicked', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      fileToScan: new File([''], 'test-receipt.jpg', { type: 'image/jpeg' }),
      scanStatus: 'idle'
    } as any)

    render(<ScanDialog scanContext="Receipt" />)
    const removeBtn = screen.getByRole('button', { name: /Remove/i })
    fireEvent.click(removeBtn)
    expect(mockStore.setFileToScan).toHaveBeenCalledWith(null)
  })
})

describe('ScanProgressIndicator Component', () => {
  it('returns null when scanStatus is not scanning or error', () => {
    const { container } = render(
      <ScanProgressIndicator
        scanStatus={'idle' as any}
        scanProgress={0}
        errorMessage={null}
        onRetry={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })
})
