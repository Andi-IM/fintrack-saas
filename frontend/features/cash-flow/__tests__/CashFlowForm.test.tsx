import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { CashFlowForm } from '../components/CashFlowForm'
import React from 'react'
import { insertCashFlow, updateCashFlow } from '@/features/cash-flow/actions/cash_flow'

// Mock sub-components to trigger onSelect and onChange callbacks
vi.mock('@/components/receipts/StatementItemSelect', () => ({
  StatementItemSelect: ({ value, onChange, onSelect }: any) => (
    <div data-testid="statement-select">
      <button 
        data-testid="trigger-statement-select-income" 
        onClick={(e) => {
          e.preventDefault()
          onChange('statement-uuid-1')
          onSelect({
            date: '2026-06-19T11:00:00Z',
            description: 'Bunga Tabungan',
            amount: 5000,
            type: 'income'
          })
        }}
      >
        Select Income Statement
      </button>
      <button 
        data-testid="trigger-statement-select-expense" 
        onClick={(e) => {
          e.preventDefault()
          onChange('statement-uuid-2')
          onSelect({
            date: '2026-06-19T12:00:00Z',
            description: 'Biaya Admin',
            amount: 6500,
            type: 'expense'
          })
        }}
      >
        Select Expense Statement
      </button>
      <button 
        data-testid="trigger-statement-select-invalid-date" 
        onClick={(e) => {
          e.preventDefault()
          onChange('statement-uuid-3')
          onSelect({
            date: 'invalid-date',
            description: 'Invalid Date Tx',
            amount: 100,
            type: 'expense'
          })
        }}
      >
        Select Statement Invalid Date
      </button>
      <button 
        data-testid="trigger-statement-select-error-date" 
        onClick={(e) => {
          e.preventDefault()
          onChange('statement-uuid-err')
          onSelect({
            date: { toString() { throw new Error('forced statement date error') } },
            description: 'Error Statement Tx',
            amount: 100,
            type: 'expense'
          })
        }}
      >
        Select Statement Error Date
      </button>
      <button 
        data-testid="trigger-statement-select-no-date" 
        onClick={(e) => {
          e.preventDefault()
          onChange('statement-uuid-4')
          onSelect({
            description: 'No Date Tx',
            amount: 100,
            type: 'expense'
          })
        }}
      >
        Select Statement No Date
      </button>
    </div>
  ),
}))

vi.mock('@/components/receipts/ReceiptSelect', () => ({
  ReceiptSelect: ({ value, onChange, onSelect }: any) => (
    <div data-testid="receipt-select">
      <button 
        data-testid="trigger-receipt-select" 
        onClick={(e) => {
          e.preventDefault()
          onChange('receipt-uuid-1')
          onSelect({
            date: '2026-06-19T10:00:00Z',
            store_name: 'Giant Supermarket',
            total_price: 125000
          })
        }}
      >
        Select Receipt
      </button>
      <button 
        data-testid="trigger-receipt-select-error-date" 
        onClick={(e) => {
          e.preventDefault()
          onChange('receipt-uuid-err')
          onSelect({
            date: { toString() { throw new Error('forced receipt date error') } },
            store_name: 'Error Receipt Tx',
            total_price: 100
          })
        }}
      >
        Select Receipt Error Date
      </button>
      <button 
        data-testid="trigger-receipt-select-no-date" 
        onClick={(e) => {
          e.preventDefault()
          onChange('receipt-uuid-no-date')
          onSelect({
            store_name: 'No Date Receipt',
            total_price: 100
          })
        }}
      >
        Select Receipt No Date
      </button>
    </div>
  ),
}))

// Mock actions
vi.mock('@/features/cash-flow/actions/cash_flow', () => ({
  insertCashFlow: vi.fn(),
  updateCashFlow: vi.fn(),
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('CashFlowForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form in insert mode by default', () => {
    render(<CashFlowForm initialData={null} />)

    expect(screen.getByText('Entri Arus Kas Manual')).toBeInTheDocument()
    expect(screen.getByLabelText(/Tanggal & Waktu/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Kategori Besar/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Metode Pembayaran/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Deskripsi \/ Catatan/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Simpan Arus Kas/i })).toBeInTheDocument()
  })

  it('renders form in edit mode when initialData is provided', () => {
    const initialData = {
      id: 'tx-123',
      date: '2026-06-19T10:00:00.000Z',
      income: 50000,
      expense: 0,
      main_category: 'Kebutuhan (Needs)',
      sub_category: 'Listrik',
      description: 'Bayar PLN',
      payment_method: 'Transfer Bank',
      receipt_id: null,
      source_item_id: null,
      created_at: '',
      user_id: 'user-1',
    }

    render(<CashFlowForm initialData={initialData} />)

    expect(screen.getByText('Edit Arus Kas')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bayar PLN')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Kebutuhan (Needs)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Simpan Perubahan/i })).toBeInTheDocument()
  })

  it('successfully submits new transaction insert', async () => {
    vi.mocked(insertCashFlow).mockResolvedValue({ success: true, data: undefined })

    render(<CashFlowForm initialData={null} />)

    // Fill income field
    const incomeInput = screen.getByLabelText(/Arus Masuk/i)
    fireEvent.change(incomeInput, { target: { value: '150000' } })

    // Fill description
    const descInput = screen.getByLabelText(/Deskripsi \/ Catatan/i)
    fireEvent.change(descInput, { target: { value: 'Gaji sampingan' } })

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Simpan Arus Kas/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(insertCashFlow).toHaveBeenCalledWith(expect.objectContaining({
        income: 150000,
        description: 'Gaji sampingan',
        main_category: 'Kebutuhan (Needs)',
      }))
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('successfully submits existing transaction update', async () => {
    vi.mocked(updateCashFlow).mockResolvedValue({ success: true, data: undefined })

    const initialData = {
      id: 'tx-123',
      date: '2026-06-19T10:00:00.000Z',
      income: 0,
      expense: 20000,
      main_category: 'Keinginan (Wants)',
      sub_category: 'Game',
      description: 'Beli Steam Wallet',
      payment_method: 'Gopay',
      receipt_id: null,
      source_item_id: null,
      created_at: '',
      user_id: 'user-1',
    }

    render(<CashFlowForm initialData={initialData} />)

    const descInput = screen.getByLabelText(/Deskripsi \/ Catatan/i)
    fireEvent.change(descInput, { target: { value: 'Beli Game Indise' } })

    const submitBtn = screen.getByRole('button', { name: /Simpan Perubahan/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(updateCashFlow).toHaveBeenCalledWith('tx-123', expect.objectContaining({
        description: 'Beli Game Indise',
        expense: 20000,
      }))
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('shows error message if insert action returns failure', async () => {
    vi.mocked(insertCashFlow).mockResolvedValue({ success: false, error: 'Database timeout error' })

    render(<CashFlowForm initialData={null} />)

    const incomeInput = screen.getByLabelText(/Arus Masuk/i)
    fireEvent.change(incomeInput, { target: { value: '50000' } })

    const submitBtn = screen.getByRole('button', { name: /Simpan Arus Kas/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Database timeout error')).toBeInTheDocument()
    })
  })

  it('shows error message if update action returns failure', async () => {
    vi.mocked(updateCashFlow).mockResolvedValue({ success: false, error: 'Failed to update database record' })

    const initialData = {
      id: 'tx-123',
      date: '2026-06-19T10:00:00.000Z',
      income: 0,
      expense: 20000,
      main_category: 'Keinginan (Wants)',
      sub_category: 'Game',
      description: 'Beli Steam Wallet',
      payment_method: 'Gopay',
      receipt_id: null,
      source_item_id: null,
      created_at: '',
      user_id: 'user-1',
    }

    render(<CashFlowForm initialData={initialData} />)

    const submitBtn = screen.getByRole('button', { name: /Simpan Perubahan/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Failed to update database record')).toBeInTheDocument()
    })
  })

  it('shows unexpected error message if action throws', async () => {
    vi.mocked(insertCashFlow).mockRejectedValue(new Error('Unexpected network crash') as any)

    render(<CashFlowForm initialData={null} />)

    const incomeInput = screen.getByLabelText(/Arus Masuk/i)
    fireEvent.change(incomeInput, { target: { value: '50000' } })

    const submitBtn = screen.getByRole('button', { name: /Simpan Arus Kas/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Terjadi kesalahan yang tidak terduga.')).toBeInTheDocument()
    })
  })

  it('auto-fills fields when a Receipt is selected', async () => {
    render(<CashFlowForm initialData={null} />)

    // Trigger selecting a receipt
    const selectReceiptBtn = screen.getByTestId('trigger-receipt-select')
    fireEvent.click(selectReceiptBtn)

    expect(screen.getByDisplayValue('Giant Supermarket')).toBeInTheDocument()
    expect(screen.getByDisplayValue('125000')).toBeInTheDocument() // Expense field filled
  })

  it('auto-fills fields when an Income Bank Statement item is selected', async () => {
    render(<CashFlowForm initialData={null} />)

    // Trigger selecting an income bank statement item
    const selectIncomeBtn = screen.getByTestId('trigger-statement-select-income')
    fireEvent.click(selectIncomeBtn)

    expect(screen.getByDisplayValue('Bunga Tabungan')).toBeInTheDocument()
    expect(screen.getByDisplayValue('5000')).toBeInTheDocument() // Income field filled
  })

  it('auto-fills fields when an Expense Bank Statement item is selected', async () => {
    render(<CashFlowForm initialData={null} />)

    // Trigger selecting an expense bank statement item
    const selectExpenseBtn = screen.getByTestId('trigger-statement-select-expense')
    fireEvent.click(selectExpenseBtn)

    expect(screen.getByDisplayValue('Biaya Admin')).toBeInTheDocument()
    expect(screen.getByDisplayValue('6500')).toBeInTheDocument() // Expense field filled
  })

  it('handles invalid dates gracefully when mapping selected document', async () => {
    render(<CashFlowForm initialData={null} />)

    // Trigger selecting item with invalid date
    const selectInvalidBtn = screen.getByTestId('trigger-statement-select-invalid-date')
    fireEvent.click(selectInvalidBtn)

    expect(screen.getByDisplayValue('Invalid Date Tx')).toBeInTheDocument()
    // Date field should NOT be updated to 'invalid-date' because of catch block
    const dateInput = screen.getByLabelText(/Tanggal & Waktu/i) as HTMLInputElement
    expect(dateInput.value).not.toBe('invalid-date')
  })

  it('covers the catch block for invalid date formats on receipt select', async () => {
    // Spy on console.error to avoid spamming test output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<CashFlowForm initialData={null} />)

    const selectErrorBtn = screen.getByTestId('trigger-receipt-select-error-date')
    fireEvent.click(selectErrorBtn)

    expect(screen.getByDisplayValue('Error Receipt Tx')).toBeInTheDocument()
    expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid date format', expect.any(Error))
    
    consoleErrorSpy.mockRestore()
  })

  it('covers the catch block for invalid date formats on statement select', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<CashFlowForm initialData={null} />)

    const selectErrorBtn = screen.getByTestId('trigger-statement-select-error-date')
    fireEvent.click(selectErrorBtn)

    expect(screen.getByDisplayValue('Error Statement Tx')).toBeInTheDocument()
    expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid date format', expect.any(Error))
    
    consoleErrorSpy.mockRestore()
  })

  it('navigates to home when Batal button is clicked', () => {
    render(<CashFlowForm initialData={null} />)
    const cancelBtn = screen.getByRole('button', { name: /Batal/i })
    fireEvent.click(cancelBtn)
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('does not auto-fill amount if either expense or income is already set', async () => {
    render(<CashFlowForm initialData={null} />)
    
    // First, fill in expense field to simulate existing value
    const expenseInput = screen.getByLabelText(/Arus Keluar/i) as HTMLInputElement
    fireEvent.change(expenseInput, { target: { value: '50000' } })
    
    // Now trigger selecting a receipt that has total_price
    const selectReceiptBtn = screen.getByTestId('trigger-receipt-select')
    fireEvent.click(selectReceiptBtn)
    
    // The expense field should remain as '50000', not changed to 125000
    expect(expenseInput.value).toBe('50000')
  })

  it('does not auto-fill income if already set when selecting statement item', async () => {
    render(<CashFlowForm initialData={null} />)
    
    // First, fill in income field to simulate existing value
    const incomeInput = screen.getByLabelText(/Arus Masuk/i) as HTMLInputElement
    fireEvent.change(incomeInput, { target: { value: '999999' } })
    
    // Trigger selecting an income bank statement item
    const selectStatementBtn = screen.getByTestId('trigger-statement-select-income')
    fireEvent.click(selectStatementBtn)
    
    // The income field should remain as '999999'
    expect(incomeInput.value).toBe('999999')
  })

  it('does not overwrite description if already set when selecting receipt', async () => {
    render(<CashFlowForm initialData={null} />)
    const descInput = screen.getByLabelText(/Deskripsi \/ Catatan/i) as HTMLInputElement
    fireEvent.change(descInput, { target: { value: 'existing desc' } })
    
    const selectReceiptBtn = screen.getByTestId('trigger-receipt-select')
    fireEvent.click(selectReceiptBtn)
    
    expect(descInput.value).toBe('existing desc')
  })

  it('does not overwrite description if already set when selecting statement item', async () => {
    render(<CashFlowForm initialData={null} />)
    const descInput = screen.getByLabelText(/Deskripsi \/ Catatan/i) as HTMLInputElement
    fireEvent.change(descInput, { target: { value: 'existing desc' } })
    
    const selectStatementBtn = screen.getByTestId('trigger-statement-select-income')
    fireEvent.click(selectStatementBtn)
    
    expect(descInput.value).toBe('existing desc')
  })

  it('handles statement item with missing date gracefully', async () => {
    render(<CashFlowForm initialData={null} />)
    const selectNoDateBtn = screen.getByTestId('trigger-statement-select-no-date')
    fireEvent.click(selectNoDateBtn)
    
    expect(screen.getByDisplayValue('No Date Tx')).toBeInTheDocument()
  })

  it('handles receipt item with missing date gracefully', async () => {
    render(<CashFlowForm initialData={null} />)
    const selectNoDateBtn = screen.getByTestId('trigger-receipt-select-no-date')
    fireEvent.click(selectNoDateBtn)
    
    expect(screen.getByDisplayValue('No Date Receipt')).toBeInTheDocument()
  })

  it('shows loading state while submitting', async () => {
    // Resolve promise manually to test loading state
    let resolvePromise: (val: any) => void = () => {}
    const submitPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    vi.mocked(insertCashFlow).mockImplementation(() => submitPromise as any)

    render(<CashFlowForm initialData={null} />)

    const incomeInput = screen.getByLabelText(/Arus Masuk/i)
    fireEvent.change(incomeInput, { target: { value: '50000' } })

    const submitBtn = screen.getByRole('button', { name: /Simpan Arus Kas/i })
    fireEvent.click(submitBtn)

    // Wait for the button to show loading spinner by querying for the animate-spin class
    await waitFor(() => {
      expect(submitBtn.querySelector('.animate-spin')).toBeInTheDocument()
      expect(submitBtn).toBeDisabled()
    })

    // Resolve the promise to finish the test cleanly, wrapped in act() to flush state updates
    await act(async () => {
      resolvePromise({ success: true, data: undefined })
    })
  })
})
