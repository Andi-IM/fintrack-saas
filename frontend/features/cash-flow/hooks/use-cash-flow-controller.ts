import { useMemo, useState, useEffect } from 'react'
import { useQueryState } from 'nuqs'
import { Tables } from '@/lib/database.types'
import { deleteCashFlow } from '@/features/cash-flow/actions/cash_flow'
import { filterTransactionsByRange } from '@/lib/utils/transaction'

export interface UseCashFlowControllerProps {
  initialTransactions: Tables<'cash_flow'>[]
  timeRange: string
}

export function useCashFlowController({ initialTransactions, timeRange }: UseCashFlowControllerProps) {
  // Mobile Drawer State
  const [activeMobileTx, setActiveMobileTx] = useState<Tables<'cash_flow'> | null>(null)

  // URL-synchronized query states for search and filters
  const [search, setSearch] = useQueryState('search', {
    defaultValue: '',
    shallow: true,
  })

  const [category, setCategory] = useQueryState('category', {
    defaultValue: 'all',
    shallow: true,
  })

  const [payment, setPayment] = useQueryState('payment', {
    defaultValue: 'all',
    shallow: true,
  })

  const [source, setSource] = useQueryState('source', {
    defaultValue: 'all',
    shallow: true,
  })

  const [page, setPage] = useQueryState('page', {
    defaultValue: '1',
    shallow: true,
  })

  const [pageSize, setPageSize] = useQueryState('pageSize', {
    defaultValue: '15',
    shallow: true,
  })

  const [range, setRange] = useQueryState('range', {
    defaultValue: timeRange || 'ALL',
    shallow: true,
  })

  const [dateFilter, setDateFilter] = useQueryState('date', {
    shallow: false,
  })

  // Local state for optimistic updates
  const [localTransactions, setLocalTransactions] = useState<Tables<'cash_flow'>[]>(initialTransactions)

  // Keep local state in sync when props update
  useEffect(() => {
    setLocalTransactions(initialTransactions)
  }, [initialTransactions])

  const handleClearDateFilter = () => {
    setDateFilter(null)
  }

  const handleDelete = async (id: string) => {
    const previousTransactions = [...localTransactions]
    setLocalTransactions(prev => prev.filter(tx => tx.id !== id))

    const result = await deleteCashFlow(id)
    if (!result.success) {
      alert(`Failed to delete cash flow: ${result.error}`)
      setLocalTransactions(previousTransactions)
    }
  }

  // Handle filter changes and reset page to 1
  const handleSearchChange = (val: string) => {
    setSearch(val || null)
    setPage('1')
  }

  const handleCategoryChange = (val: string) => {
    setCategory(val === 'all' ? null : val)
    setPage('1')
  }

  const handlePaymentChange = (val: string) => {
    setPayment(val === 'all' ? null : val)
    setPage('1')
  }

  const handleSourceChange = (val: string) => {
    setSource(val === 'all' ? null : val)
    setPage('1')
  }

  const handlePageChange = (newPage: number) => {
    setPage(String(newPage))
  }

  const handlePageSizeChange = (size: string) => {
    setPageSize(size)
    setPage('1')
  }

  const handleRangeChange = (val: string) => {
    setRange(val === 'ALL' ? null : val)
    setPage('1')
  }

  const handleResetFilters = () => {
    setSearch(null)
    setCategory(null)
    setPayment(null)
    setSource(null)
    setRange(null)
    setPage('1')
  }

  // Extract unique categories and payment methods
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>()
    localTransactions.forEach(tx => {
      if (tx.main_category) cats.add(tx.main_category)
    })
    return Array.from(cats).sort()
  }, [localTransactions])

  const uniquePaymentMethods = useMemo(() => {
    const methods = new Set<string>()
    localTransactions.forEach(tx => {
      if (tx.payment_method) methods.add(tx.payment_method)
    })
    return Array.from(methods).sort()
  }, [localTransactions])

  // Filter pipeline
  const filteredTransactions = useMemo(() => {
    let result = filterTransactionsByRange(localTransactions, range || 'ALL')

    if (dateFilter) {
      result = result.filter(tx => tx.date.split('T')[0] === dateFilter)
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(tx => 
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.sub_category && tx.sub_category.toLowerCase().includes(q)) ||
        (tx.main_category && tx.main_category.toLowerCase().includes(q))
      )
    }

    if (category && category !== 'all') {
      result = result.filter(tx => tx.main_category === category)
    }

    if (payment && payment !== 'all') {
      result = result.filter(tx => tx.payment_method === payment)
    }

    if (source && source !== 'all') {
      if (source === 'receipt') {
        result = result.filter(tx => tx.receipt_id !== null)
      } else if (source === 'statement') {
        result = result.filter(tx => tx.source_item_id !== null)
      } else if (source === 'manual') {
        result = result.filter(tx => tx.receipt_id === null && tx.source_item_id === null)
      }
    }

    return result
  }, [localTransactions, range, dateFilter, search, category, payment, source])

  // Pagination calculation
  const currentPage = parseInt(page || '1', 10) || 1
  const limit = parseInt(pageSize || '15', 10) || 15
  const totalItems = filteredTransactions.length
  const totalPages = Math.ceil(totalItems / limit) || 1
  const validPage = Math.min(Math.max(currentPage, 1), totalPages)
  const startIndex = (validPage - 1) * limit

  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(startIndex, startIndex + limit)
  }, [filteredTransactions, startIndex, limit])

  const hasActiveFilters = !!(search || category !== 'all' || payment !== 'all' || source !== 'all' || (range && range !== 'ALL'))

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (validPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (validPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', validPage - 1, validPage, validPage + 1, '...', totalPages)
      }
    }
    return pages
  }, [totalPages, validPage])

  return {
    activeMobileTx,
    setActiveMobileTx,
    search,
    category,
    payment,
    source,
    page,
    pageSize,
    range,
    dateFilter,
    localTransactions,
    handleClearDateFilter,
    handleDelete,
    handleSearchChange,
    handleCategoryChange,
    handlePaymentChange,
    handleSourceChange,
    handlePageChange,
    handlePageSizeChange,
    handleRangeChange,
    handleResetFilters,
    uniqueCategories,
    uniquePaymentMethods,
    filteredTransactions,
    paginatedTransactions,
    hasActiveFilters,
    pageNumbers,
    validPage,
    limit,
    startIndex,
    totalItems,
    totalPages,
  }
}
