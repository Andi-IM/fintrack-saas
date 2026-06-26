import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CashFlowList } from '@/features/cash-flow/components/CashFlowList'
import { useCashFlowController } from '@/features/cash-flow/hooks/use-cash-flow-controller'
import React from 'react'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock controller hook
vi.mock('@/features/cash-flow/hooks/use-cash-flow-controller', () => ({
  useCashFlowController: vi.fn(),
}))

// Dummy transactions
const mockTransactions = [
  {
    id: 'tx-1',
    created_at: '2026-06-19T00:00:00Z',
    date: '2026-06-19T10:00:00Z',
    description: 'Beli Kopi Susu',
    income: 0,
    expense: 25000,
    main_category: 'Makanan & Minuman',
    sub_category: 'Kopi',
    payment_method: 'Gopay',
    receipt_id: null,
    source_item_id: null,
  },
  {
    id: 'tx-2',
    created_at: '2026-06-19T00:00:00Z',
    date: '2026-06-19T11:00:00Z',
    description: 'Gaji Bulanan',
    income: 10000000,
    expense: 0,
    main_category: 'Gaji',
    sub_category: 'Utama',
    payment_method: 'Transfer Bank',
    receipt_id: null,
    source_item_id: 'statement-item-99',
  }
]

describe('CashFlowList Component', () => {
  const mockControllerReturn = {
    activeMobileTx: null,
    setActiveMobileTx: vi.fn(),
    search: '',
    category: 'all',
    payment: 'all',
    source: 'all',
    range: 'ALL',
    dateFilter: null,
    handleClearDateFilter: vi.fn(),
    handleDelete: vi.fn(),
    handleSearchChange: vi.fn(),
    handleCategoryChange: vi.fn(),
    handlePaymentChange: vi.fn(),
    handleSourceChange: vi.fn(),
    handlePageChange: vi.fn(),
    handlePageSizeChange: vi.fn(),
    handleRangeChange: vi.fn(),
    handleResetFilters: vi.fn(),
    uniqueCategories: ['Makanan & Minuman', 'Gaji'],
    uniquePaymentMethods: ['Gopay', 'Transfer Bank'],
    paginatedTransactions: mockTransactions,
    hasActiveFilters: false,
    pageNumbers: [1, 2],
    validPage: 1,
    limit: 10,
    startIndex: 0,
    totalItems: 2,
    totalPages: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCashFlowController).mockReturnValue(mockControllerReturn as any)
  })

  it('renders transactions successfully on desktop view', () => {
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)

    expect(screen.getAllByText('Beli Kopi Susu')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Gaji Bulanan')[0]).toBeInTheDocument()
    expect(screen.getAllByText(/25\.000/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/10\.000\.000/)[0]).toBeInTheDocument()
  })

  it('renders categorized tags correctly', () => {
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)

    expect(screen.getAllByText('Makanan & Minuman').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Gaji').length).toBeGreaterThan(0)
  })

  it('toggles mobile drawer on card tap', () => {
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)

    const mobileHeading = screen.getAllByText('Beli Kopi Susu').find(el => el.tagName === 'H4')
    const cardElement = mobileHeading?.closest('.cursor-pointer')
    expect(cardElement).not.toBeNull()
    
    if (cardElement) {
      fireEvent.click(cardElement)
    }

    expect(mockControllerReturn.setActiveMobileTx).toHaveBeenCalledWith(mockTransactions[0])
  })

  it('triggers search filter changes', async () => {
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)

    const searchInput = screen.getByPlaceholderText('Cari deskripsi / kategori...')
    fireEvent.change(searchInput, { target: { value: 'Gaji' } })
    
    expect(mockControllerReturn.handleSearchChange).toHaveBeenCalledWith('Gaji')
  })

  it('calls router.push when edit button is clicked on desktop', () => {
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)
    const editBtn = screen.getAllByRole('button').find(btn => btn.className.includes('text-indigo-700'))!
    fireEvent.click(editBtn)
    expect(mockPush).toHaveBeenCalledWith('/add?edit=tx-1')
  })

  it('calls handleClearDateFilter when date filter button is clicked', () => {
    vi.mocked(useCashFlowController).mockReturnValue({
      ...mockControllerReturn,
      dateFilter: '2026-06-19',
    } as any)
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)
    const dateFilterBtn = screen.getByText(/Filter Tanggal/i)
    fireEvent.click(dateFilterBtn)
    expect(mockControllerReturn.handleClearDateFilter).toHaveBeenCalled()
  })

  it('calls handleResetFilters when Bersihkan Filter button is clicked', () => {
    vi.mocked(useCashFlowController).mockReturnValue({
      ...mockControllerReturn,
      hasActiveFilters: true,
    } as any)
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)
    const clearBtn = screen.getByText(/Bersihkan Filter/i)
    fireEvent.click(clearBtn)
    expect(mockControllerReturn.handleResetFilters).toHaveBeenCalled()
  })

  it('calls handleSearchChange("") when search clear button is clicked', () => {
    vi.mocked(useCashFlowController).mockReturnValue({
      ...mockControllerReturn,
      search: 'Kopi',
    } as any)
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)
    const clearBtn = screen.getByRole('textbox').nextSibling! as HTMLElement
    fireEvent.click(clearBtn)
    expect(mockControllerReturn.handleSearchChange).toHaveBeenCalledWith('')
  })

  it('calls filter handlers on select change', () => {
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)
    
    const selects = screen.getAllByRole('combobox')
    
    // Category select
    fireEvent.change(selects[0], { target: { value: 'Gaji' } })
    expect(mockControllerReturn.handleCategoryChange).toHaveBeenCalledWith('Gaji')
    
    // Payment select
    fireEvent.change(selects[1], { target: { value: 'Gopay' } })
    expect(mockControllerReturn.handlePaymentChange).toHaveBeenCalledWith('Gopay')
    
    // Source select
    fireEvent.change(selects[2], { target: { value: 'receipt' } })
    expect(mockControllerReturn.handleSourceChange).toHaveBeenCalledWith('receipt')
    
    // Range select
    fireEvent.change(selects[3], { target: { value: '1W' } })
    expect(mockControllerReturn.handleRangeChange).toHaveBeenCalledWith('1W')
  })

  it('calls page handlers when page size and page buttons are clicked', () => {
    vi.mocked(useCashFlowController).mockReturnValue({
      ...mockControllerReturn,
      pageNumbers: [1, '...', 5],
      validPage: 2,
      totalPages: 5,
    } as any)
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)

    // Page size change
    const pageSizeSelect = screen.getByDisplayValue('10')
    fireEvent.change(pageSizeSelect, { target: { value: '25' } })
    expect(mockControllerReturn.handlePageSizeChange).toHaveBeenCalledWith('25')

    // Page number click
    const page5Btn = screen.getByText('5')
    fireEvent.click(page5Btn)
    expect(mockControllerReturn.handlePageChange).toHaveBeenCalledWith(5)

    // Prev page click
    const prevBtn = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-chevron-left'))!
    fireEvent.click(prevBtn)
    expect(mockControllerReturn.handlePageChange).toHaveBeenCalledWith(1) // validPage - 1

    // Next page click
    const nextBtn = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-chevron-right'))!
    fireEvent.click(nextBtn)
    expect(mockControllerReturn.handlePageChange).toHaveBeenCalledWith(3) // validPage + 1
  })

  it('handles mobile drawer actions correctly', () => {
    const activeMobileTx = mockTransactions[0]
    vi.mocked(useCashFlowController).mockReturnValue({
      ...mockControllerReturn,
      activeMobileTx,
    } as any)
    
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)

    // Click Edit in mobile drawer
    const editBtn = screen.getByText(/Edit Transaksi/i)
    fireEvent.click(editBtn)
    expect(mockPush).toHaveBeenCalledWith(`/add?edit=${activeMobileTx.id}`)
    expect(mockControllerReturn.setActiveMobileTx).toHaveBeenCalledWith(null)

    // Click Delete in mobile drawer
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const deleteBtn = screen.getByText(/Hapus Transaksi/i)
    fireEvent.click(deleteBtn)
    expect(mockControllerReturn.handleDelete).toHaveBeenCalledWith(activeMobileTx.id)
    expect(mockControllerReturn.setActiveMobileTx).toHaveBeenCalledWith(null)
    
    // Dialog onOpenChange trigger / Batal button click
    const dialogCloseBtn = screen.getByText('Batal')
    fireEvent.click(dialogCloseBtn)
    expect(mockControllerReturn.setActiveMobileTx).toHaveBeenCalledWith(null)

    // Trigger onOpenChange via Escape key
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' })
    expect(mockControllerReturn.setActiveMobileTx).toHaveBeenCalledWith(null)
  })

  it('handles desktop delete transaction click', () => {
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)
    const deleteBtn = screen.getAllByRole('button').find(btn => btn.className.includes('text-rose-700'))!
    fireEvent.click(deleteBtn)
    expect(mockControllerReturn.handleDelete).toHaveBeenCalledWith('tx-1')
  })

  it('renders ellipse placeholder in pagination when page number is "..."', () => {
    vi.mocked(useCashFlowController).mockReturnValue({
      ...mockControllerReturn,
      pageNumbers: [1, '...', 5],
      validPage: 1,
      totalPages: 5,
    } as any)
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('renders correctly when transaction has no description', () => {
    const txWithoutDesc = {
      ...mockTransactions[0],
      id: 'tx-no-desc',
      description: '',
    }
    vi.mocked(useCashFlowController).mockReturnValue({
      ...mockControllerReturn,
      paginatedTransactions: [txWithoutDesc],
    } as any)
    render(<CashFlowList transactions={[txWithoutDesc]} timeRange="ALL" />)
    
    // In desktop view, "Tanpa Deskripsi" should be rendered
    expect(screen.getAllByText('Tanpa Deskripsi').length).toBeGreaterThan(0)
    
    // Verify aria-labels on Edit and Delete fallback to 'arus kas'
    const editBtn = screen.getAllByRole('button').find(btn => btn.className.includes('text-indigo-700'))!
    expect(editBtn.getAttribute('aria-label')).toBe('Edit arus kas')
  })

  it('handles mobile drawer rendering for income transaction', () => {
    const incomeTx = mockTransactions[1] // Gaji Bulanan has income
    vi.mocked(useCashFlowController).mockReturnValue({
      ...mockControllerReturn,
      activeMobileTx: incomeTx,
    } as any)
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)

    // Should render + 10.000.000 in emerald text (with potential Rp symbol)
    const incomeEls = screen.getAllByText(/\+\s*(Rp\.?\s*)?10\.000\.000/)
    expect(incomeEls.length).toBeGreaterThan(0)
    expect(incomeEls[0].className).toContain('text-emerald-600')
  })

  it('does not call handleDelete if window.confirm returns false in mobile drawer', () => {
    const activeMobileTx = mockTransactions[0]
    vi.mocked(useCashFlowController).mockReturnValue({
      ...mockControllerReturn,
      activeMobileTx,
    } as any)
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)

    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const deleteBtn = screen.getByText(/Hapus Transaksi/i)
    fireEvent.click(deleteBtn)

    // Should NOT call handleDelete
    expect(mockControllerReturn.handleDelete).not.toHaveBeenCalled()
    // Should NOT close the drawer immediately inside the click handler
    expect(mockControllerReturn.setActiveMobileTx).not.toHaveBeenCalled()
  })
})
