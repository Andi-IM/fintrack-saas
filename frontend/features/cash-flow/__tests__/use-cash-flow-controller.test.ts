import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCashFlowController } from '../hooks/use-cash-flow-controller'

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
vi.mock('@/lib/actions/cash_flow', () => ({
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
  }
]

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
    expect(result.current.uniqueCategories).toEqual(['Gaji', 'Makanan & Minuman'])
    expect(result.current.uniquePaymentMethods).toEqual(['Gopay', 'Transfer Bank'])
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

    expect(result.current.localTransactions.length).toBe(1)
    expect(result.current.localTransactions[0].id).toBe('tx-2')
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
})
