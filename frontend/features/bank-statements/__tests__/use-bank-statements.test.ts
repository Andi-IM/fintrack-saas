import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBankStatements } from '@/features/bank-statements/hooks/use-bank-statements'
import {
  getGroupedBankStatements,
  getFileUrl,
  deleteBankStatement,
  updateStatementItem,
  deleteStatementItem,
  addStatementItem,
} from '@/features/bank-statements/actions/statements'

vi.mock('@/features/bank-statements/actions/statements', () => ({
  getGroupedBankStatements: vi.fn(),
  getFileUrl: vi.fn(),
  deleteBankStatement: vi.fn(),
  updateStatementItem: vi.fn(),
  deleteStatementItem: vi.fn(),
  addStatementItem: vi.fn(),
}))

const mockStatement = {
  id: 'stmt-1',
  bank_name: 'Bank Test',
  statement_period: 'Jun 2026',
  opening_balance: 1000000,
  closing_balance: 2000000,
  file_path: 'statements/test.pdf',
  created_at: '',
  bank_statement_items: [],
}

const mockGroupedData = { 'Bank Test': [mockStatement] }

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useBankStatements hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns loading state while query is in flight', () => {
    vi.mocked(getGroupedBankStatements).mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    expect(result.current.loading).toBe(true)
    expect(result.current.groupedData).toBeUndefined()
  })

  it('returns grouped data once query resolves', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.groupedData).toEqual(mockGroupedData)
  })

  it('auto-expands first bank on load', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.expandedBanks).toContain('Bank Test'))
  })

  it('throws when query returns success: false', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: false, error: 'DB error' })
    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.groupedData).toBeUndefined()
  })

  it('toggleBank adds and removes bank from expandedBanks', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.toggleBank('Bank BRI'))
    expect(result.current.expandedBanks).toContain('Bank BRI')

    act(() => result.current.toggleBank('Bank BRI'))
    expect(result.current.expandedBanks).not.toContain('Bank BRI')
  })

  it('togglePeriod adds and removes period from expandedPeriods', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.togglePeriod('stmt-1'))
    expect(result.current.expandedPeriods).toContain('stmt-1')

    act(() => result.current.togglePeriod('stmt-1'))
    expect(result.current.expandedPeriods).not.toContain('stmt-1')
  })

  // ── handleDeleteStatement ────────────────────────────────────────────────

  it('handleDeleteStatement calls mutation when confirmed', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    vi.mocked(deleteBankStatement).mockResolvedValue({ success: true, data: undefined })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const fakeEvent = { stopPropagation: vi.fn() } as any
    act(() => result.current.handleDeleteStatement(fakeEvent, 'stmt-1', 'statements/test.pdf'))

    await waitFor(() => expect(deleteBankStatement).toHaveBeenCalledWith('stmt-1', 'statements/test.pdf'))
    vi.restoreAllMocks()
  })

  it('handleDeleteStatement does nothing when confirm is cancelled', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const fakeEvent = { stopPropagation: vi.fn() } as any
    act(() => result.current.handleDeleteStatement(fakeEvent, 'stmt-1', 'statements/test.pdf'))

    expect(deleteBankStatement).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('deleteMutation onError shows alert on failure', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    vi.mocked(deleteBankStatement).mockResolvedValue({ success: false, error: 'Delete failed' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const fakeEvent = { stopPropagation: vi.fn() } as any
    act(() => result.current.handleDeleteStatement(fakeEvent, 'stmt-1', 'statements/test.pdf'))

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Delete failed'))
    vi.restoreAllMocks()
  })

  // ── handleDeleteItem ─────────────────────────────────────────────────────

  it('handleDeleteItem calls mutation when confirmed', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    vi.mocked(deleteStatementItem).mockResolvedValue({ success: true, data: undefined })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const fakeEvent = { stopPropagation: vi.fn() } as any
    act(() => result.current.handleDeleteItem(fakeEvent, 'item-1'))

    await waitFor(() => expect(deleteStatementItem).toHaveBeenCalledWith('item-1'))
    vi.restoreAllMocks()
  })

  it('handleDeleteItem does nothing when confirm is cancelled', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const fakeEvent = { stopPropagation: vi.fn() } as any
    act(() => result.current.handleDeleteItem(fakeEvent, 'item-1'))

    expect(deleteStatementItem).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('deleteItemMutation onError shows alert on failure', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    vi.mocked(deleteStatementItem).mockResolvedValue({ success: false, error: 'Item delete failed' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const fakeEvent = { stopPropagation: vi.fn() } as any
    act(() => result.current.handleDeleteItem(fakeEvent, 'item-1'))

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Item delete failed'))
    vi.restoreAllMocks()
  })

  // ── handleViewFile ───────────────────────────────────────────────────────

  it('handleViewFile opens window on success', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    vi.mocked(getFileUrl).mockResolvedValue({ success: true, data: 'https://example.com/file.pdf' })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => result.current.handleViewFile('statements/test.pdf'))

    expect(openSpy).toHaveBeenCalledWith('https://example.com/file.pdf', '_blank')
    vi.restoreAllMocks()
  })

  it('handleViewFile shows alert on failure', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    vi.mocked(getFileUrl).mockResolvedValue({ success: false, error: 'Access denied' })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => result.current.handleViewFile('statements/test.pdf'))

    expect(alertSpy).toHaveBeenCalledWith('Access denied')
    vi.restoreAllMocks()
  })

  // ── updateItemMutation onError ───────────────────────────────────────────

  it('updateItemMutation onError shows alert on failure', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    vi.mocked(updateStatementItem).mockResolvedValue({ success: false, error: 'Update failed' })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      try {
        await result.current.updateItemMutation.mutateAsync({
          itemId: 'item-1',
          data: { date: '2026-06-01T00:00', description: 'Test', amount: 100, type: 'expense', category: '' },
        })
      } catch {}
    })

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Update failed'))
    vi.restoreAllMocks()
  })

  // ── addItemMutation onError ──────────────────────────────────────────────

  it('addItemMutation onError shows alert on failure', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    vi.mocked(addStatementItem).mockResolvedValue({ success: false, error: 'Add failed' })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      try {
        await result.current.addItemMutation.mutateAsync({
          statementId: 'stmt-1',
          data: { date: '2026-06-01T00:00', description: 'New', amount: 50000, type: 'income', category: '' },
        })
      } catch {}
    })

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Add failed'))
    vi.restoreAllMocks()
  })

  // ── state setters ────────────────────────────────────────────────────────

  it('setEditingItem and setAddingToStatement update state correctly', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const fakeItem = { id: 'i', date: '', description: 'x', amount: 0, type: 'income', category: null, balance: null, created_at: '', statement_id: 'stmt-1', metadata: null } as any

    act(() => result.current.setEditingItem({ statementId: 'stmt-1', item: fakeItem }))
    expect(result.current.editingItem?.statementId).toBe('stmt-1')

    act(() => result.current.setEditingItem(null))
    expect(result.current.editingItem).toBeNull()

    act(() => result.current.setAddingToStatement('stmt-1'))
    expect(result.current.addingToStatement).toBe('stmt-1')

    act(() => result.current.setAddingToStatement(null))
    expect(result.current.addingToStatement).toBeNull()
  })

  it('setActiveMobileItem updates and clears state', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({ success: true, data: mockGroupedData as any })
    const { result } = renderHook(() => useBankStatements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const fakeItem = { id: 'i', date: '', description: 'x', amount: 0, type: 'income', category: null, balance: null, created_at: '', statement_id: 'stmt-1', metadata: null } as any

    act(() => result.current.setActiveMobileItem({ statementId: 'stmt-1', item: fakeItem }))
    expect(result.current.activeMobileItem?.statementId).toBe('stmt-1')

    act(() => result.current.setActiveMobileItem(null))
    expect(result.current.activeMobileItem).toBeNull()
  })
})
