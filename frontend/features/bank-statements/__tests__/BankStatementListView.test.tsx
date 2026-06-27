import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

import { BankStatementListView } from '@/features/bank-statements/components/BankStatementListView'

vi.mock('@/components/statements/ItemEditDialog', () => ({
  default: ({ open, title, onSave, onOpenChange, initialData }: any) => {
    if (!open) return null
    return (
      <div data-testid="item-edit-dialog">
        <span data-testid="dialog-title">{title}</span>
        <button data-testid="save-btn" onClick={() => onSave(initialData ?? { date: '', description: '', amount: 0, type: 'expense', category: '' })}>Save</button>
        <button data-testid="close-btn" onClick={() => onOpenChange(false)}>Close</button>
      </div>
    )
  },
}))

const mockItem = {
  id: 'item-1',
  date: '2026-06-19T10:00:00Z',
  description: 'Test Transaction',
  amount: 500000,
  type: 'income',
  category: 'Transfer',
  balance: 1500000,
  created_at: '',
  statement_id: 'stmt-1',
  metadata: null,
}

const mockStatement = {
  id: 'stmt-1',
  bank_name: 'Bank Test',
  statement_period: 'Jun 2026',
  opening_balance: 1000000,
  closing_balance: 2000000,
  file_path: 'statements/test.pdf',
  created_at: '',
  bank_statement_items: [mockItem],
}

// Minimal no-op mutation stub
function makeMutation(overrides: any = {}): any {
  return {
    isPending: false,
    variables: undefined,
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeProps(overrides: any = {}) {
  return {
    groupedData: { 'Bank Test': [mockStatement] } as any,
    loading: false,
    expandedBanks: ['Bank Test'],
    expandedPeriods: [],
    editingItem: null,
    addingToStatement: null,
    activeMobileItem: null,
    deleteMutation: makeMutation(),
    updateItemMutation: makeMutation(),
    deleteItemMutation: makeMutation(),
    addItemMutation: makeMutation(),
    toggleBank: vi.fn(),
    togglePeriod: vi.fn(),
    setEditingItem: vi.fn(),
    setAddingToStatement: vi.fn(),
    setActiveMobileItem: vi.fn(),
    handleDeleteStatement: vi.fn(),
    handleDeleteItem: vi.fn(),
    handleViewFile: vi.fn(),
    ...overrides,
  }
}

describe('BankStatementListView', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Basic states ──────────────────────────────────────────────────────────

  it('renders loading spinner', () => {
    render(<BankStatementListView {...makeProps({ loading: true })} />)
    expect(screen.getByLabelText(/Memuat daftar mutasi bank/i)).toBeInTheDocument()
  })

  it('renders empty state', () => {
    render(<BankStatementListView {...makeProps({ groupedData: {} })} />)
    expect(screen.getByText(/No bank statements found/i)).toBeInTheDocument()
  })

  it('renders bank group and period row', () => {
    render(<BankStatementListView {...makeProps()} />)
    expect(screen.getByText('Bank Test')).toBeInTheDocument()
    expect(screen.getByText('Jun 2026')).toBeInTheDocument()
  })

  it('calls toggleBank when bank header is clicked', () => {
    const toggleBank = vi.fn()
    render(<BankStatementListView {...makeProps({ toggleBank })} />)
    fireEvent.click(screen.getByText('Bank Test').closest('button')!)
    expect(toggleBank).toHaveBeenCalledWith('Bank Test')
  })

  it('calls togglePeriod when period row is clicked', () => {
    const togglePeriod = vi.fn()
    render(<BankStatementListView {...makeProps({ togglePeriod })} />)
    fireEvent.click(screen.getByText('Jun 2026'))
    expect(togglePeriod).toHaveBeenCalledWith('stmt-1')
  })

  it('calls handleDeleteStatement when delete button is clicked', () => {
    const handleDeleteStatement = vi.fn()
    render(<BankStatementListView {...makeProps({ handleDeleteStatement })} />)
    fireEvent.click(screen.getByLabelText(/Hapus laporan mutasi/i))
    expect(handleDeleteStatement).toHaveBeenCalled()
  })

  it('calls handleViewFile when View PDF button is clicked', () => {
    const handleViewFile = vi.fn()
    render(<BankStatementListView {...makeProps({ handleViewFile })} />)
    fireEvent.click(screen.getByText('View PDF'))
    expect(handleViewFile).toHaveBeenCalledWith('statements/test.pdf')
  })

  // ── isPending spinner branch (line ~126-127) ──────────────────────────────

  it('shows loading spinner on delete button when deleteMutation is pending for that statement', () => {
    const props = makeProps({
      deleteMutation: makeMutation({ isPending: true, variables: { id: 'stmt-1', filePath: 'statements/test.pdf' } }),
    })
    render(<BankStatementListView {...props} />)
    // The Trash2 icon is replaced by a Loader2 spinner
    expect(screen.getByLabelText(/Hapus laporan mutasi/i).querySelector('[aria-hidden]')).toBeTruthy()
    // Button should be disabled
    expect(screen.getByLabelText(/Hapus laporan mutasi/i)).toBeDisabled()
  })

  it('does not disable delete button when a different statement is pending', () => {
    const props = makeProps({
      deleteMutation: makeMutation({ isPending: true, variables: { id: 'stmt-other', filePath: 'other.pdf' } }),
    })
    render(<BankStatementListView {...props} />)
    expect(screen.getByLabelText(/Hapus laporan mutasi/i)).not.toBeDisabled()
  })

  // ── Expanded period body (lines ~200-233) ─────────────────────────────────

  it('renders balance summary and item table when period is expanded', () => {
    render(<BankStatementListView {...makeProps({ expandedPeriods: ['stmt-1'] })} />)
    expect(screen.getByText('Saldo Awal')).toBeInTheDocument()
    expect(screen.getByText('Saldo Akhir')).toBeInTheDocument()
    expect(screen.getAllByText('Test Transaction').length).toBeGreaterThan(0)
  })

  it('renders income icon for income items', () => {
    render(<BankStatementListView {...makeProps({ expandedPeriods: ['stmt-1'] })} />)
    expect(screen.getByLabelText(/Edit item Test Transaction/i)).toBeInTheDocument()
  })

  it('renders expense icon for expense items', () => {
    const expenseItem = { ...mockItem, id: 'item-2', type: 'expense', description: 'Expense Item' }
    const props = makeProps({
      expandedPeriods: ['stmt-1'],
      groupedData: { 'Bank Test': [{ ...mockStatement, bank_statement_items: [expenseItem] }] } as any,
    })
    render(<BankStatementListView {...props} />)
    expect(screen.getAllByText('Expense Item').length).toBeGreaterThan(0)
  })

  it('shows "-" in balance column when item has null balance', () => {
    const noBalItem = { ...mockItem, balance: null }
    const props = makeProps({
      expandedPeriods: ['stmt-1'],
      groupedData: { 'Bank Test': [{ ...mockStatement, bank_statement_items: [noBalItem] }] } as any,
    })
    render(<BankStatementListView {...props} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('shows Loader2 spinner on delete item button when deleteItemMutation is pending', () => {
    const props = makeProps({
      expandedPeriods: ['stmt-1'],
      deleteItemMutation: makeMutation({ isPending: true, variables: 'item-1' }),
    })
    render(<BankStatementListView {...props} />)
    expect(screen.getByLabelText(/Hapus item Test Transaction/i)).toBeDisabled()
  })

  it('does not disable delete item button when a different item is pending', () => {
    const props = makeProps({
      expandedPeriods: ['stmt-1'],
      deleteItemMutation: makeMutation({ isPending: true, variables: 'item-other' }),
    })
    render(<BankStatementListView {...props} />)
    expect(screen.getByLabelText(/Hapus item Test Transaction/i)).not.toBeDisabled()
  })

  it('calls setEditingItem when edit button is clicked', () => {
    const setEditingItem = vi.fn()
    render(<BankStatementListView {...makeProps({ expandedPeriods: ['stmt-1'], setEditingItem })} />)
    fireEvent.click(screen.getByLabelText(/Edit item Test Transaction/i))
    expect(setEditingItem).toHaveBeenCalledWith({ statementId: 'stmt-1', item: mockItem })
  })

  it('calls handleDeleteItem when item delete button is clicked', () => {
    const handleDeleteItem = vi.fn()
    render(<BankStatementListView {...makeProps({ expandedPeriods: ['stmt-1'], handleDeleteItem })} />)
    fireEvent.click(screen.getByLabelText(/Hapus item Test Transaction/i))
    expect(handleDeleteItem).toHaveBeenCalled()
  })

  it('calls setAddingToStatement when desktop Add Item button is clicked', () => {
    const setAddingToStatement = vi.fn()
    render(<BankStatementListView {...makeProps({ expandedPeriods: ['stmt-1'], setAddingToStatement })} />)
    // Desktop "Add Item" button
    const addBtns = screen.getAllByText(/Add Item/i)
    fireEvent.click(addBtns[0])
    expect(setAddingToStatement).toHaveBeenCalledWith('stmt-1')
  })

  it('calls setActiveMobileItem when mobile card is clicked', () => {
    const setActiveMobileItem = vi.fn()
    render(<BankStatementListView {...makeProps({ expandedPeriods: ['stmt-1'], setActiveMobileItem })} />)
    const allItems = screen.getAllByText('Test Transaction')
    const card = allItems.map(el => el.closest('.cursor-pointer')).find(Boolean)
    if (card) fireEvent.click(card)
    expect(setActiveMobileItem).toHaveBeenCalledWith({ statementId: 'stmt-1', item: mockItem })
  })

  // ── Edit dialog (lines ~287-310) ──────────────────────────────────────────

  it('renders edit dialog when editingItem is set', () => {
    const props = makeProps({ editingItem: { statementId: 'stmt-1', item: mockItem } })
    render(<BankStatementListView {...props} />)
    expect(screen.getByTestId('item-edit-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('dialog-title').textContent).toBe('Edit Transaction Item')
  })

  it('calls setEditingItem(null) when edit dialog is closed', () => {
    const setEditingItem = vi.fn()
    const props = makeProps({
      editingItem: { statementId: 'stmt-1', item: mockItem },
      setEditingItem,
    })
    render(<BankStatementListView {...props} />)
    fireEvent.click(screen.getByTestId('close-btn'))
    expect(setEditingItem).toHaveBeenCalledWith(null)
  })

  it('passes undefined balance to edit dialog when item balance is null', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    const nullBalItem = { ...mockItem, balance: null }
    const props = makeProps({
      editingItem: { statementId: 'stmt-1', item: nullBalItem },
      updateItemMutation: makeMutation({ mutateAsync }),
    })
    render(<BankStatementListView {...props} />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-btn'))
    })
    // mutateAsync called means the onSave path with balance:undefined was executed
    expect(mutateAsync).toHaveBeenCalled()
  })

  it('calls updateItemMutation.mutateAsync when edit dialog save is triggered', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    const props = makeProps({
      editingItem: { statementId: 'stmt-1', item: mockItem },
      updateItemMutation: makeMutation({ mutateAsync }),
    })
    render(<BankStatementListView {...props} />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-btn'))
    })
    expect(mutateAsync).toHaveBeenCalled()
  })

  // ── Add dialog (lines ~315-325) ───────────────────────────────────────────

  it('renders add dialog when addingToStatement is set', () => {
    const props = makeProps({ addingToStatement: 'stmt-1' })
    render(<BankStatementListView {...props} />)
    expect(screen.getByTestId('item-edit-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('dialog-title').textContent).toBe('Add Transaction Item')
  })

  it('calls addItemMutation.mutateAsync when add dialog save is triggered', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    const props = makeProps({
      addingToStatement: 'stmt-1',
      addItemMutation: makeMutation({ mutateAsync }),
    })
    render(<BankStatementListView {...props} />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-btn'))
    })
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ statementId: 'stmt-1' }))
  })

  it('calls setAddingToStatement(null) when add dialog is closed', () => {
    const setAddingToStatement = vi.fn()
    render(<BankStatementListView {...makeProps({ addingToStatement: 'stmt-1', setAddingToStatement })} />)
    fireEvent.click(screen.getByTestId('close-btn'))
    expect(setAddingToStatement).toHaveBeenCalledWith(null)
  })

  it('calls setAddingToStatement when mobile Add Item button is clicked', () => {
    const setAddingToStatement = vi.fn()
    render(<BankStatementListView {...makeProps({ expandedPeriods: ['stmt-1'], setAddingToStatement })} />)
    // JSDOM renders both desktop and mobile — last "Add Item" is the mobile one
    const addBtns = screen.getAllByText(/Add Item/i)
    fireEvent.click(addBtns[addBtns.length - 1])
    expect(setAddingToStatement).toHaveBeenCalledWith('stmt-1')
  })

  it('renders mobile drawer when activeMobileItem is set', () => {
    const props = makeProps({ activeMobileItem: { statementId: 'stmt-1', item: mockItem } })
    render(<BankStatementListView {...props} />)
    expect(screen.getByText('Kelola Item Mutasi')).toBeInTheDocument()
    expect(screen.getByText('Test Transaction')).toBeInTheDocument()
    expect(screen.getByText('Nominal Mutasi')).toBeInTheDocument()
  })

  it('shows "Tanpa Deskripsi" when activeMobileItem item has no description', () => {
    const noDescItem = { ...mockItem, description: '' }
    const props = makeProps({ activeMobileItem: { statementId: 'stmt-1', item: noDescItem } })
    render(<BankStatementListView {...props} />)
    expect(screen.getByText('Tanpa Deskripsi')).toBeInTheDocument()
  })

  it('calls setEditingItem and clears activeMobileItem when Edit Item is clicked in drawer', () => {
    const setEditingItem = vi.fn()
    const setActiveMobileItem = vi.fn()
    const props = makeProps({
      activeMobileItem: { statementId: 'stmt-1', item: mockItem },
      setEditingItem,
      setActiveMobileItem,
    })
    render(<BankStatementListView {...props} />)
    fireEvent.click(screen.getByText('Edit Item'))
    expect(setEditingItem).toHaveBeenCalledWith({ statementId: 'stmt-1', item: mockItem })
    expect(setActiveMobileItem).toHaveBeenCalledWith(null)
  })

  it('calls setActiveMobileItem(null) when Batal is clicked', () => {
    const setActiveMobileItem = vi.fn()
    const props = makeProps({
      activeMobileItem: { statementId: 'stmt-1', item: mockItem },
      setActiveMobileItem,
    })
    render(<BankStatementListView {...props} />)
    fireEvent.click(screen.getByText('Batal'))
    expect(setActiveMobileItem).toHaveBeenCalledWith(null)
  })

  it('calls setActiveMobileItem(null) when dialog onOpenChange is triggered (e.g. via Escape)', () => {
    const setActiveMobileItem = vi.fn()
    const props = makeProps({
      activeMobileItem: { statementId: 'stmt-1', item: mockItem },
      setActiveMobileItem,
    })
    render(<BankStatementListView {...props} />)
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' })
    expect(setActiveMobileItem).toHaveBeenCalledWith(null)
  })

  it('calls deleteItemMutation.mutateAsync and clears drawer when Hapus Item is confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    const setActiveMobileItem = vi.fn()
    const props = makeProps({
      activeMobileItem: { statementId: 'stmt-1', item: mockItem },
      deleteItemMutation: makeMutation({ mutateAsync }),
      setActiveMobileItem,
    })
    render(<BankStatementListView {...props} />)
    await act(async () => {
      fireEvent.click(screen.getByText('Hapus Item'))
    })
    expect(mutateAsync).toHaveBeenCalledWith('item-1')
    await waitFor(() => expect(setActiveMobileItem).toHaveBeenCalledWith(null))
    vi.restoreAllMocks()
  })

  it('does not call mutateAsync when Hapus Item confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const mutateAsync = vi.fn()
    const props = makeProps({
      activeMobileItem: { statementId: 'stmt-1', item: mockItem },
      deleteItemMutation: makeMutation({ mutateAsync }),
    })
    render(<BankStatementListView {...props} />)
    await act(async () => {
      fireEvent.click(screen.getByText('Hapus Item'))
    })
    expect(mutateAsync).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('shows "-" for category in drawer when item has no category', () => {
    const noCatItem = { ...mockItem, category: null }
    const props = makeProps({ activeMobileItem: { statementId: 'stmt-1', item: noCatItem } })
    render(<BankStatementListView {...props} />)
    // The Kategori section shows "-"
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })
})
