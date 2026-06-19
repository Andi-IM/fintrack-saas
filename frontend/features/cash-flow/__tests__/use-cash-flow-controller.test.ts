import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCashFlowController } from '../hooks/use-cash-flow-controller'
import { deleteCashFlow } from '@/features/cash-flow/actions/cash_flow'

// Global mock state variables
let mockQuerySearch = ''
let mockQueryCategory = 'all'
let mockQueryPayment = 'all'
let mockQuerySource = 'all'
let mockQueryPage = '1'
let mockQueryPageSize = '15'
let mockQueryRange = 'ALL'
let mockQueryDate: string | null = null

const mockSetSearch = vi.fn()
const mockSetCategory = vi.fn()
const mockSetPayment = vi.fn()
const mockSetSource = vi.fn()
const mockSetPage = vi.fn()
const mockSetPageSize = vi.fn()
const mockSetRange = vi.fn()
const mockSetDateFilter = vi.fn()

vi.mock('nuqs', () => ({
  useQueryState: (key: string) => {
    if (key === 'search') return [mockQuerySearch, mockSetSearch]
    if (key === 'category') return [mockQueryCategory, mockSetCategory]
    if (key === 'payment') return [mockQueryPayment, mockSetPayment]
    if (key === 'source') return [mockQuerySource, mockSetSource]
    if (key === 'page') return [mockQueryPage, mockSetPage]
    if (key === 'pageSize') return [mockQueryPageSize, mockSetPageSize]
    if (key === 'range') return [mockQueryRange, mockSetRange]
    if (key === 'date') return [mockQueryDate, mockSetDateFilter]
    return [null, vi.fn()]
  }
}))

// Mock actions
vi.mock('@/features/cash-flow/actions/cash_flow', () => ({
  deleteCashFlow: vi.fn().mockResolvedValue({ success: true }),
}))

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
    user_id: 'user-123'
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
    user_id: 'user-123'
  },
  {
    id: 'tx-3',
    created_at: '2026-06-19T00:00:00Z',
    date: '2026-06-19T12:00:00Z',
    description: 'Beli Buku',
    income: 0,
    expense: 150000,
    main_category: 'Hobi',
    sub_category: 'Buku',
    payment_method: 'Cash',
    receipt_id: 'receipt-123',
    source_item_id: null,
    user_id: 'user-123'
  }
]

const manyMockTransactions = Array.from({ length: 30 }, (_, i) => ({
  id: `tx-${i + 1}`,
  created_at: '2026-06-19T00:00:00Z',
  date: '2026-06-19T10:00:00Z',
  description: `Transaction ${i + 1}`,
  income: i % 2 === 0 ? 100000 : 0,
  expense: i % 2 !== 0 ? 50000 : 0,
  main_category: i % 2 === 0 ? 'Income' : 'Expense',
  sub_category: 'Test',
  payment_method: 'Cash',
  receipt_id: null,
  source_item_id: null,
  user_id: 'user-123'
}))

describe('useCashFlowController hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQuerySearch = ''
    mockQueryCategory = 'all'
    mockQueryPayment = 'all'
    mockQuerySource = 'all'
    mockQueryPage = '1'
    mockQueryPageSize = '15'
    mockQueryRange = 'ALL'
    mockQueryDate = null
  })

  it('initializes default values correctly', () => {
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))

    expect(result.current.activeMobileTx).toBeNull()
    expect(result.current.localTransactions).toEqual(mockTransactions)
    expect(result.current.uniqueCategories).toEqual(['Gaji', 'Hobi', 'Makanan & Minuman'])
    expect(result.current.uniquePaymentMethods).toEqual(['Cash', 'Gopay', 'Transfer Bank'])
  })

  it('triggers search changes successfully', () => {
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))

    act(() => {
      result.current.handleSearchChange('Kopi')
    })

    expect(mockSetSearch).toHaveBeenCalledWith('Kopi')
    expect(mockSetPage).toHaveBeenCalledWith('1')
  })

  it('handles reset filters', () => {
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))

    act(() => {
      result.current.handleResetFilters()
    })

    expect(mockSetSearch).toHaveBeenCalledWith(null)
    expect(mockSetCategory).toHaveBeenCalledWith(null)
    expect(mockSetPayment).toHaveBeenCalledWith(null)
    expect(mockSetSource).toHaveBeenCalledWith(null)
    expect(mockSetRange).toHaveBeenCalledWith(null)
    expect(mockSetPage).toHaveBeenCalledWith('1')
  })

  it('triggers category and payment filter changes', () => {
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))

    act(() => {
      result.current.handleCategoryChange('Food')
    })
    expect(mockSetCategory).toHaveBeenCalledWith('Food')

    act(() => {
      result.current.handlePaymentChange('all')
    })
    expect(mockSetPayment).toHaveBeenCalledWith(null)
  })

  it('manages page pagination state', () => {
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))

    act(() => {
      result.current.handlePageChange(2)
    })
    expect(mockSetPage).toHaveBeenCalledWith('2')

    act(() => {
      result.current.handlePageSizeChange('25')
    })
    expect(mockSetPageSize).toHaveBeenCalledWith('25')
  })

  it('triggers range and source changes successfully', () => {
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))

    act(() => {
      result.current.handleRangeChange('1W')
    })
    expect(mockSetRange).toHaveBeenCalledWith('1W')

    act(() => {
      result.current.handleSourceChange('receipt')
    })
    expect(mockSetSource).toHaveBeenCalledWith('receipt')
  })

  it('triggers clear date filter', () => {
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))

    act(() => {
      result.current.handleClearDateFilter()
    })
    expect(mockSetDateFilter).toHaveBeenCalledWith(null)
  })

  it('handles transaction deletion', async () => {
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))

    await act(async () => {
      await result.current.handleDelete('tx-1')
    })

    expect(result.current.localTransactions.length).toBe(2)
    expect(result.current.localTransactions[0].id).toBe('tx-2')
  })

  it('handles transaction deletion failure and restores local state', async () => {
    vi.mocked(deleteCashFlow).mockResolvedValue({ success: false, error: 'Failed to delete' })
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))

    await act(async () => {
      await result.current.handleDelete('tx-1')
    })

    expect(result.current.localTransactions.length).toBe(3)
    expect(result.current.localTransactions.some(tx => tx.id === 'tx-1')).toBe(true)
  })

  it('filters by source "receipt" correctly', () => {
    mockQuerySource = 'receipt'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.filteredTransactions.length).toBe(1)
    expect(result.current.filteredTransactions[0].id).toBe('tx-3')
  })

  it('filters by source "statement" correctly', () => {
    mockQuerySource = 'statement'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.filteredTransactions.length).toBe(1)
    expect(result.current.filteredTransactions[0].id).toBe('tx-2')
  })

  it('filters by source "manual" correctly', () => {
    mockQuerySource = 'manual'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.filteredTransactions.length).toBe(1)
    expect(result.current.filteredTransactions[0].id).toBe('tx-1')
  })

  it('calculates correct page numbers for totalPages <= 5', () => {
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.pageNumbers).toEqual([1])
  })

  it('calculates correct page numbers for validPage <=3', () => {
    mockQueryPageSize = '5'
    mockQueryPage = '2'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: manyMockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.pageNumbers).toEqual([1, 2, 3, 4, '...', 6])
  })

  it('calculates correct page numbers for validPage >= totalPages -2', () => {
    mockQueryPageSize = '5'
    mockQueryPage = '5'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: manyMockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.pageNumbers).toEqual([1, '...', 3, 4, 5, 6])
  })

  it('calculates correct page numbers for middle validPage', () => {
    mockQueryPageSize = '5'
    mockQueryPage = '4'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: [...manyMockTransactions, { id: 'tx-31' } as any, { id: 'tx-32' } as any, { id: 'tx-33' } as any, { id: 'tx-34' } as any, { id: 'tx-35' } as any], // 35 items, 7 pages
      timeRange: 'ALL'
    }))
    expect(result.current.pageNumbers).toEqual([1, '...', 3, 4, 5, '...', 7])
  })

  it('filters by date, sub_category, and source matching correctly', () => {
    mockQuerySearch = 'Utama'
    mockQuerySource = 'statement'

    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))

    expect(result.current.filteredTransactions.length).toBe(1)
  })

  it('covers filters for dateFilter, category, and payment', () => {
    mockQueryDate = '2026-06-19'
    mockQueryCategory = 'Gaji'
    mockQueryPayment = 'Transfer Bank'

    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))

    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('handles activeMobileTx state changes', () => {
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))

    act(() => {
      result.current.setActiveMobileTx(mockTransactions[0])
    })

    expect(result.current.activeMobileTx).toEqual(mockTransactions[0])
  })

  it('handles filtering by date', () => {
    mockQueryDate = '2026-06-19'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.filteredTransactions.length).toBeGreaterThan(0)
  })

  it('handles filtering by category', () => {
    mockQueryCategory = 'Gaji'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.filteredTransactions.length).toBeGreaterThan(0)
  })

  it('handles filtering by payment method', () => {
    mockQueryPayment = 'Gopay'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.filteredTransactions.length).toBeGreaterThan(0)
  })

  it('handles filtering by search term', () => {
    mockQuerySearch = 'Kopi'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.filteredTransactions.length).toBeGreaterThan(0)
  })

  it('handles filtering by source: receipt', () => {
    mockQuerySource = 'receipt'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.filteredTransactions.some(tx => tx.receipt_id)).toBeTruthy()
  })

  it('handles filtering by source: statement', () => {
    mockQuerySource = 'statement'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.filteredTransactions.some(tx => tx.source_item_id)).toBeTruthy()
  })

  it('handles filtering by source: manual', () => {
    mockQuerySource = 'manual'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.filteredTransactions.every(tx => tx.receipt_id === null && tx.source_item_id === null)).toBeTruthy()
  })

  it('calls handleClearDateFilter to clear date filter', () => {
    mockQueryDate = '2026-06-19'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    act(() => {
      result.current.handleClearDateFilter()
    })
    expect(mockSetDateFilter).toHaveBeenCalledWith(null)
  })

  it('calls handleResetFilters to reset all filters', () => {
    mockQuerySearch = 'test'
    mockQueryCategory = 'Makan'
    mockQueryPayment = 'Cash'
    mockQuerySource = 'receipt'
    mockQueryRange = 'THIS_WEEK'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    act(() => {
      result.current.handleResetFilters()
    })
    expect(mockSetSearch).toHaveBeenCalledWith(null)
    expect(mockSetCategory).toHaveBeenCalledWith(null)
    expect(mockSetPayment).toHaveBeenCalledWith(null)
    expect(mockSetSource).toHaveBeenCalledWith(null)
    expect(mockSetRange).toHaveBeenCalledWith(null)
    expect(mockSetPage).toHaveBeenCalledWith('1')
  })

  it('handles handleDelete when delete fails', async () => {
    vi.mocked(deleteCashFlow).mockResolvedValue({ success: false, error: 'Failed to delete' })
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    await act(async () => {
      await result.current.handleDelete(mockTransactions[0].id)
    })
    expect(result.current.localTransactions.length).toBe(mockTransactions.length) // rollback
  })

  it('handles page numbers when totalPages <=5', () => {
    mockQueryPageSize = '2'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.pageNumbers).toEqual([1,2]) // 4 items, 2/page → 2 pages
  })

  it('handles page numbers when validPage <=3', () => {
    const manyMockTransactions = Array.from({ length: 100 }, (_, i) => ({
      ...mockTransactions[0],
      id: `tx-${i}`,
      amount: 1000 + i
    }))
    mockQueryPage = '2'
    mockQueryPageSize = '10'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: manyMockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.pageNumbers).toEqual([1,2,3,4,'...', 10])
  })

  it('handles page numbers when validPage >= totalPages -2', () => {
    const manyMockTransactions = Array.from({ length: 100 }, (_, i) => ({
      ...mockTransactions[0],
      id: `tx-${i}`,
      amount: 1000 + i
    }))
    mockQueryPage = '9'
    mockQueryPageSize = '10'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: manyMockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.pageNumbers).toEqual([1,'...',7,8,9,10])
  })

  it('handles pagination with multiple pages', () => {
    mockQueryPage = '2'
    mockQueryPageSize = '1'
    const { result } = renderHook(() => useCashFlowController({
      initialTransactions: mockTransactions,
      timeRange: 'ALL'
    }))
    expect(result.current.validPage).toBe(2)
    expect(result.current.paginatedTransactions.length).toBe(1)
  })
})
