import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CashFlowForm } from '../CashFlowForm'
import React from 'react'
import { insertCashFlow, updateCashFlow } from '@/lib/actions/cash_flow'

// Mock sub-components to keep form test isolated and lightweight
vi.mock('@/components/receipts/StatementItemSelect', () => ({
  StatementItemSelect: () => <div data-testid="statement-select">Statement Select Mock</div>,
}))

vi.mock('@/components/receipts/ReceiptSelect', () => ({
  ReceiptSelect: () => <div data-testid="receipt-select">Receipt Select Mock</div>,
}))

// Mock actions
vi.mock('@/lib/actions/cash_flow', () => ({
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
    const { container } = render(<CashFlowForm initialData={null} />)

    expect(screen.getByText('Entri Arus Kas Manual')).toBeInTheDocument()
    expect(screen.getByLabelText(/Tanggal & Waktu/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Kategori Besar/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Metode Pembayaran/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Deskripsi \/ Catatan/i)).toBeInTheDocument()
    
    // Default submit button
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

    const { container } = render(<CashFlowForm initialData={null} />)

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

    const { container } = render(<CashFlowForm initialData={initialData} />)

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

  it('shows error message if action returns failure', async () => {
    vi.mocked(insertCashFlow).mockResolvedValue({ success: false, error: 'Database timeout error' })

    const { container } = render(<CashFlowForm initialData={null} />)

    const incomeInput = screen.getByLabelText(/Arus Masuk/i)
    fireEvent.change(incomeInput, { target: { value: '50000' } })

    const submitBtn = screen.getByRole('button', { name: /Simpan Arus Kas/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Database timeout error')).toBeInTheDocument()
    })
  })
})
