import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BankStatementReviewForm } from '@/features/receipts/components/BankStatementReviewForm'
import { useScanStore } from '@/features/receipts/hooks/use-scan-store'
import { formatDateForInput } from '@/lib/utils/date'

vi.mock('../hooks/use-scan-store', () => ({
  useScanStore: vi.fn()
}))

const mockHandleReparseBankStatement = vi.fn()
let mockRescanState = {
  handleReparseBankStatement: mockHandleReparseBankStatement,
  isRescanning: false,
  canReparseBankStatement: true,
}

vi.mock('../hooks/use-bank-statement-rescan', () => ({
  useBankStatementRescan: vi.fn(() => mockRescanState)
}))

const mockHandleSaveScannedItems = vi.fn()

vi.mock('../hooks/use-submit-scanned-data', () => ({
  useSubmitScannedData: vi.fn(() => ({
    handleSaveScannedItems: mockHandleSaveScannedItems
  }))
}))

describe('BankStatementReviewForm Component', () => {
  const mockStore = {
    scanResult: null,
    updateScanResultItem: vi.fn(),
    deleteScanResultItem: vi.fn(),
    updateScanResultField: vi.fn(),
    resetScan: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRescanState = {
      handleReparseBankStatement: mockHandleReparseBankStatement,
      isRescanning: false,
      canReparseBankStatement: true,
    }
    vi.mocked(useScanStore).mockReturnValue(mockStore as any)
  })

  it('returns null if scanResult is null', () => {
    const { container } = render(<BankStatementReviewForm />)
    expect(container.firstChild).toBeNull()
  })

  it('renders correctly when scanResult.items is undefined', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        bank: 'BCA',
        statementPeriod: 'May 2026',
        openingBalance: 100000,
        closingBalance: 200000
      }
    } as any)
    render(<BankStatementReviewForm />)
    expect(screen.getByDisplayValue('BCA')).toBeInTheDocument()
  })

  it('renders and allows editing of bank statement fields and transactions', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        bank: 'BCA',
        statementPeriod: 'May 2026',
        openingBalance: 100000,
        closingBalance: 200000,
        items: [
          { name: 'Transfer in', amount: 50000, type: 'income', date: '2026-05-01T10:00:00.000Z' }
        ]
      }
    } as any)

    render(<BankStatementReviewForm />)

    // Edit bank name (line 39)
    const bankInput = screen.getByDisplayValue('BCA')
    fireEvent.change(bankInput, { target: { value: 'BCA Syariah' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('bank', 'BCA Syariah')

    // Edit period (line 47)
    const periodInput = screen.getByDisplayValue('May 2026')
    fireEvent.change(periodInput, { target: { value: 'June 2026' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('statementPeriod', 'June 2026')

    // Edit opening balance (line 56)
    const openingInput = screen.getByDisplayValue('100000')
    fireEvent.change(openingInput, { target: { value: '150000' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('openingBalance', 150000)

    // Edit opening balance with invalid value
    fireEvent.change(openingInput, { target: { value: '' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('openingBalance', 0)

    // Edit closing balance (line 65)
    const closingInput = screen.getByDisplayValue('200000')
    fireEvent.change(closingInput, { target: { value: '250000' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('closingBalance', 250000)

    // Edit closing balance with invalid value
    fireEvent.change(closingInput, { target: { value: '' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('closingBalance', 0)

    // Edit transaction name (line 77)
    const nameInput = screen.getByDisplayValue('Transfer in')
    fireEvent.change(nameInput, { target: { value: 'Salary' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'name', 'Salary')

    // Edit transaction type (line 82)
    const typeSelect = screen.getByRole('combobox')
    fireEvent.change(typeSelect, { target: { value: 'expense' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'type', 'expense')

    // Edit transaction date (line 93)
    const expectedDateDisplay = formatDateForInput('2026-05-01T10:00:00.000Z')
    const dateInput = screen.getByDisplayValue(expectedDateDisplay)
    fireEvent.change(dateInput, { target: { value: '2026-05-02T11:00' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'date', new Date('2026-05-02T11:00').toISOString())

    // Edit empty date
    fireEvent.change(dateInput, { target: { value: '' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'date', '')

    // Edit transaction amount (line 99)
    const amountInput = screen.getByDisplayValue('50000')
    fireEvent.change(amountInput, { target: { value: '60000' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'amount', 60000)

    // Click delete transaction button (line 103)
    const deleteBtn = screen.getByRole('button', { name: /Hapus transaksi ini/i })
    fireEvent.click(deleteBtn)
    expect(mockStore.deleteScanResultItem).toHaveBeenCalledWith(0)
  })

  it('calls resetScan when Discard button is clicked', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        bank: 'BCA',
        statementPeriod: 'May 2026',
        openingBalance: 100000,
        closingBalance: 200000,
        items: [
          { name: 'Transfer in', amount: 50000, type: 'income', date: '2026-05-01T10:00:00.000Z' }
        ]
      }
    } as any)

    render(<BankStatementReviewForm />)
    const discardBtn = screen.getByText('Discard')
    fireEvent.click(discardBtn)
    expect(mockStore.resetScan).toHaveBeenCalled()
  })

  it('calls handleSaveScannedItems when Confirm & Save button is clicked', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        bank: 'BCA',
        statementPeriod: 'May 2026',
        openingBalance: 100000,
        closingBalance: 200000,
        items: [
          { name: 'Transfer in', amount: 50000, type: 'income', date: '2026-05-01T10:00:00.000Z' }
        ]
      }
    } as any)

    render(<BankStatementReviewForm />)
    const saveBtn = screen.getByText('Confirm & Save')
    fireEvent.click(saveBtn)
    expect(mockHandleSaveScannedItems).toHaveBeenCalled()
  })

  it('disables review editing and final actions while re-scanning', () => {
    mockRescanState = {
      handleReparseBankStatement: mockHandleReparseBankStatement,
      isRescanning: true,
      canReparseBankStatement: true,
    }
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        bank: 'BCA',
        statementPeriod: 'May 2026',
        openingBalance: 100000,
        closingBalance: 200000,
        items: [
          { name: 'Transfer in', amount: 50000, type: 'income', category: 'Transfer', bank: 'BCA', date: '2026-05-01T10:00:00.000Z' }
        ]
      }
    } as any)

    render(<BankStatementReviewForm />)

    expect(screen.getByLabelText('Bank Name')).toBeDisabled()
    expect(screen.getByLabelText('Period')).toBeDisabled()
    expect(screen.getByLabelText('Opening Balance')).toBeDisabled()
    expect(screen.getByLabelText('Closing Balance')).toBeDisabled()
    expect(screen.getByLabelText('Nama transaksi bank 1')).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Transaction Type' })).toBeDisabled()
    expect(screen.getByLabelText('Tanggal transaksi bank 1')).toBeDisabled()
    expect(screen.getByLabelText('Nominal transaksi bank 1')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Hapus transaksi ini/i })).toBeDisabled()
    expect(screen.getByText('Discard')).toBeDisabled()
    expect(screen.getByText('Confirm & Save')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Re-scanning/i })).toBeDisabled()
  })

  it('renders when scanResult.items is an empty array', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        bank: 'BCA',
        statementPeriod: 'May 2026',
        openingBalance: 100000,
        closingBalance: 200000,
        items: []
      }
    } as any)

    render(<BankStatementReviewForm />)
    expect(screen.getByText('Extraction Successful - Review & Edit')).toBeInTheDocument()
  })

  it('renders scanResult.items with non-bank transaction items', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        bank: 'BCA',
        statementPeriod: 'May 2026',
        openingBalance: 100000,
        closingBalance: 200000,
        items: [
          { name: 'Non-bank item', amount: 50000 }, // Not a bank transaction
          { name: 'Salary', amount: 5000000, type: 'income', date: '2026-06-19T10:00:00Z' }
        ]
      }
    } as any)

    render(<BankStatementReviewForm />)
    expect(screen.getByDisplayValue('Salary')).toBeInTheDocument()
  })

  it('handles null/undefined values for optional fields', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        bank: 'BCA',
        statementPeriod: undefined,
        openingBalance: null,
        closingBalance: undefined,
        items: []
      }
    } as any)

    render(<BankStatementReviewForm />)
    const numberInputs = screen.getAllByDisplayValue('0')
    expect(numberInputs.length).toBeGreaterThan(0)
  })

  it('announces asynchronous re-scan errors with an alert role', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      errorMessage: 'Failed to re-scan bank statement.',
      scanResult: {
        bank: 'BCA',
        statementPeriod: 'May 2026',
        openingBalance: 100000,
        closingBalance: 200000,
        items: []
      }
    } as any)

    render(<BankStatementReviewForm />)

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to re-scan bank statement.')
  })
})
