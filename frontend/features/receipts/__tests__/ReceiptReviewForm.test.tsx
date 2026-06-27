import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReceiptReviewForm } from '@/features/receipts/components/ReceiptReviewForm'
import { useScanStore } from '@/features/receipts/hooks/use-scan-store'
import { useSubmitScannedData } from '@/features/receipts/hooks/use-submit-scanned-data'


vi.mock('../hooks/use-scan-store', () => ({
  useScanStore: vi.fn()
}))

vi.mock('../hooks/use-submit-scanned-data', () => ({
  useSubmitScannedData: vi.fn(() => ({
    handleSaveScannedItems: vi.fn()
  }))
}))

describe('ReceiptReviewForm Component', () => {
  const mockStore = {
    scanResult: null,
    updateScanResultItem: vi.fn(),
    deleteScanResultItem: vi.fn(),
    addScanResultItem: vi.fn(),
    updateScanResultField: vi.fn(),
    resetScan: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useScanStore).mockReturnValue(mockStore as any)
  })

  it('returns null if scanResult is null', () => {
    const { container } = render(<ReceiptReviewForm />)
    expect(container.firstChild).toBeNull()
  })

  it('renders and allows editing of "shopping" type receipt fields', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        type: 'shopping',
        merchant: 'Alfamart',
        date: '2026-06-19T10:00:00.000Z',
        total: 10000,
        address: 'Jl. Kemang',
        paymentMethod: 'Cash',
        amountPaid: 10000,
        change: 0,
        referenceNumber: 'REF123',
        items: [
          { name: 'Susu', amount: 10000 }
        ]
      }
    } as any)

    render(<ReceiptReviewForm />)

    // Edit type (select box)
    const typeSelect = screen.getByRole('combobox')
    fireEvent.change(typeSelect, { target: { value: 'atm' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('type', 'atm')

    // Edit merchant
    const merchantInput = screen.getByDisplayValue('Alfamart')
    fireEvent.change(merchantInput, { target: { value: 'Alfamart Baru' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('merchant', 'Alfamart Baru')

    // Edit date
    const dateInput = screen.getByDisplayValue('2026-06-19T10:00')
    fireEvent.change(dateInput, { target: { value: '2026-06-19T11:00' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('date', new Date('2026-06-19T11:00').toISOString())

    // Edit empty date
    fireEvent.change(dateInput, { target: { value: '' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('date', '')

    // Get all input fields with value 10.000
    const inputs10k = screen.getAllByDisplayValue('10.000')
    const totalInput = inputs10k[0]
    const amountPaidInput = inputs10k[1]
    const itemAmountInput = inputs10k[2]

    // Edit total
    fireEvent.change(totalInput, { target: { value: '15000' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('total', 15000)

    // Edit total with invalid/empty value (fallback to 0)
    fireEvent.change(totalInput, { target: { value: '' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('total', 0)

    // Edit address
    const addressInput = screen.getByDisplayValue('Jl. Kemang')
    fireEvent.change(addressInput, { target: { value: 'Jl. Kemang Raya' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('address', 'Jl. Kemang Raya')

    // Edit payment method
    const paymentMethodInput = screen.getByDisplayValue('Cash')
    fireEvent.change(paymentMethodInput, { target: { value: 'Debit' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('paymentMethod', 'Debit')

    // Edit amount paid
    fireEvent.change(amountPaidInput, { target: { value: '20000' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('amountPaid', 20000)

    // Edit amount paid with invalid value
    fireEvent.change(amountPaidInput, { target: { value: '' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('amountPaid', 0)

    // Edit change
    const changeInput = screen.getByDisplayValue('0')
    fireEvent.change(changeInput, { target: { value: '5000' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('change', 5000)

    // Edit change with invalid value
    fireEvent.change(changeInput, { target: { value: '' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('change', 0)

    // Edit reference number
    const refInput = screen.getByDisplayValue('REF123')
    fireEvent.change(refInput, { target: { value: 'REF456' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('referenceNumber', 'REF456')

    // Edit item name
    const itemNameInput = screen.getByDisplayValue('Susu')
    fireEvent.change(itemNameInput, { target: { value: 'Susu UHT' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'name', 'Susu UHT')

    // Edit item price (Harga Satuan)
    fireEvent.change(itemAmountInput, { target: { value: '12000' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'price', 12000)
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'amount', 12000)

    // Edit item quantity
    const quantityInput = screen.getByDisplayValue('1')
    fireEvent.change(quantityInput, { target: { value: '3' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'quantity', 3)
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'amount', 30000)

    // Click Add Item button
    const addBtn = screen.getByRole('button', { name: /Tambah Item/i })
    fireEvent.click(addBtn)
    expect(mockStore.addScanResultItem).toHaveBeenCalled()

    // Click Delete Item button
    const deleteBtn = screen.getByRole('button', { name: /Hapus item ini/i })
    fireEvent.click(deleteBtn)
    expect(mockStore.deleteScanResultItem).toHaveBeenCalledWith(0)
  })

  it('renders and allows editing of "atm" type receipt fields', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        type: 'atm',
        merchant: 'Mandiri ATM',
        date: '2026-06-19T10:00:00.000Z',
        total: 100000,
        atmId: 'ATM001',
        transactionType: 'withdrawal',
        fee: 6500,
        referenceNumber: 'REF999'
      }
    } as any)

    render(<ReceiptReviewForm />)

    // Edit ATM ID
    const atmIdInput = screen.getByDisplayValue('ATM001')
    fireEvent.change(atmIdInput, { target: { value: 'ATM002' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('atmId', 'ATM002')

    // Edit transaction type
    const txTypeSelect = screen.getByDisplayValue('Penarikan (Withdrawal)')
    fireEvent.change(txTypeSelect, { target: { value: 'deposit' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('transactionType', 'deposit')

    // Edit transaction type to 'transfer'
    fireEvent.change(txTypeSelect, { target: { value: 'transfer' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('transactionType', 'transfer')

    // Edit Admin Fee
    const feeInput = screen.getByDisplayValue('6.500')
    fireEvent.change(feeInput, { target: { value: '0' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('fee', 0)

    // Edit Admin Fee with invalid value
    fireEvent.change(feeInput, { target: { value: '' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('fee', 0)

    // Edit reference number in ATM mode
    const refInput = screen.getByDisplayValue('REF999')
    fireEvent.change(refInput, { target: { value: 'REF777' } })
    expect(mockStore.updateScanResultField).toHaveBeenCalledWith('referenceNumber', 'REF777')
  })

  it('renders shopping type receipt with no items', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        type: 'shopping',
        merchant: 'Alfamart',
        date: '2026-06-19T10:00:00.000Z',
        total: 10000,
        items: []
      }
    } as any)

    render(<ReceiptReviewForm />)
    expect(screen.getByText(/Belum ada item terdeteksi/i)).toBeInTheDocument()
  })

  it('renders shopping type receipt with scanResult.items undefined', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        type: 'shopping',
        merchant: 'Alfamart',
        date: '2026-06-19T10:00:00Z',
        total: 10000
      }
    } as any)

    render(<ReceiptReviewForm />)
    expect(screen.getByText('Extraction Successful - Review & Edit')).toBeInTheDocument()
  })

  it('calls addScanResultItem when add item button is clicked', () => {
    const mockAddScanResultItem = vi.fn()
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      addScanResultItem: mockAddScanResultItem,
      scanResult: {
        type: 'shopping',
        merchant: 'Alfamart',
        date: '2026-06-19T10:00:00Z',
        total: 10000
      }
    } as any)

    render(<ReceiptReviewForm />)
    const addBtn = screen.getByRole('button', { name: /Tambah Item/i })
    fireEvent.click(addBtn)
    expect(mockAddScanResultItem).toHaveBeenCalledTimes(1)
  })

  it('does not show add item button when receipt type is atm', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        type: 'atm',
        merchant: 'Mandiri ATM',
        date: '2026-06-19T10:00:00.000Z',
        total: 100000
      }
    } as any)

    render(<ReceiptReviewForm />)
    expect(screen.queryByRole('button', { name: /Tambah Item/i })).not.toBeInTheDocument()
  })

  it('has accessible labels for all form fields in shopping mode', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        type: 'shopping',
        merchant: 'Alfamart',
        date: '2026-06-19T10:00:00.000Z',
        total: 10000,
        items: []
      }
    } as any)

    render(<ReceiptReviewForm />)

    expect(screen.getByLabelText(/Receipt Type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Merchant/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date & Time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Total Amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Store Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Payment Method/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Cash Paid/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Change/i)).toBeInTheDocument()
  })

  it('has accessible labels for all form fields in atm mode', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        type: 'atm',
        merchant: 'Mandiri ATM',
        date: '2026-06-19T10:00:00.000Z',
        total: 100000,
        atmId: 'ATM001',
        transactionType: 'withdrawal',
        fee: 0,
        referenceNumber: 'REF999'
      }
    } as any)

    render(<ReceiptReviewForm />)

    expect(screen.getByLabelText(/Receipt Type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Merchant/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date & Time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Total Amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ATM ID/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Transaction Type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Admin Fee/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nomor Referensi/i)).toBeInTheDocument()
  })

  it('covers fallback logic for missing fields and empty items', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        // Omitting type, merchant, date, total, amountPaid to trigger || fallbacks
        items: [
          // Item missing quantity and price, having only amount to trigger calculation fallback
          { name: 'Unknown Item', amount: 50000, quantity: undefined, price: undefined },
          // Item with 0 quantity and undefined amount to trigger oldQty <= 0 fallback and item.amount ?? 0
          { name: 'Zero Qty Item', quantity: 0, amount: undefined, price: undefined },
          // Item with undefined amount to trigger item.amount ?? 0
          { name: 'No Amount Item', quantity: 1, price: 100, amount: undefined }
        ]
      }
    } as any)

    render(<ReceiptReviewForm />)

    // Should default to shopping type
    expect(screen.getByDisplayValue('Belanja (Shopping)')).toBeInTheDocument()

    // Test item quantity and price calculation fallbacks
    const quantityInput = screen.getByLabelText(/Jumlah item 1/i)
    
    // Change quantity to empty string (evaluates to 0 via parseFloat)
    fireEvent.change(quantityInput, { target: { value: '' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'quantity', 0)
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'price', 50000) // Fallback price calculation
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'amount', 0) // 0 * 50000

    // Test item price fallback
    const priceInput = screen.getByLabelText(/Harga satuan item 1/i)
    fireEvent.change(priceInput, { target: { value: '' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'price', 0)
    // qty fallback to 1 since we didn't update the local DOM state, we are testing the onChange logic which reads from item.quantity ?? 1
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(0, 'amount', 0) 

    // Test zero quantity item
    const quantityInput2 = screen.getByLabelText(/Jumlah item 2/i)
    fireEvent.change(quantityInput2, { target: { value: '2' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(1, 'quantity', 2)
    // price evaluates to (item.amount ?? 0) since oldQty was 0
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(1, 'price', 0) 
    
    // Test price input for zero quantity item
    const priceInput2 = screen.getByLabelText(/Harga satuan item 2/i)
    fireEvent.change(priceInput2, { target: { value: '150' } })
    expect(mockStore.updateScanResultItem).toHaveBeenCalledWith(1, 'price', 150)
  })

  it('renders correctly when scanResult.items is null or undefined', () => {
    vi.mocked(useScanStore).mockReturnValue({
      ...mockStore,
      scanResult: {
        type: 'shopping',
        total: 10000,
        items: null // triggers scanResult.items ? ... : [] false branch
      }
    } as any)
    render(<ReceiptReviewForm />)
    expect(screen.getByText(/Belum ada item terdeteksi/i)).toBeInTheDocument()
  })
})
