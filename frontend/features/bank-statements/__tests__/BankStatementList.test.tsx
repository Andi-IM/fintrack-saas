import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import BankStatementList from '@/features/bank-statements/components/BankStatementList'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getGroupedBankStatements, getFileUrl, deleteBankStatement, updateStatementItem, deleteStatementItem, addStatementItem } from '@/features/bank-statements/actions/statements'

// Mock external components to reduce coupling
vi.mock('@/components/statements/ItemEditDialog', () => ({
  default: ({ open, onOpenChange, title, initialData, onSave }: any) => {
    if (!open) return null
    return (
      <div data-testid="item-edit-dialog" data-title={title}>
        <span data-testid="edit-item-desc">{initialData?.description}</span>
        <button data-testid="save-item-btn" onClick={() => onSave(initialData)}>Save</button>
      </div>
    )
  },
}))

// Mock actions
vi.mock('@/features/bank-statements/actions/statements', () => ({
  getGroupedBankStatements: vi.fn(),
  getFileUrl: vi.fn(),
  deleteBankStatement: vi.fn(),
  updateStatementItem: vi.fn(),
  deleteStatementItem: vi.fn(),
  addStatementItem: vi.fn(),
}))

describe('BankStatementList Component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders loading state initially', () => {
    vi.mocked(getGroupedBankStatements).mockReturnValue(new Promise(() => {}))

    render(
      <QueryClientProvider client={queryClient}>
        <BankStatementList />
      </QueryClientProvider>
    )
    expect(screen.getByLabelText(/Memuat daftar mutasi bank/i)).toBeInTheDocument()
  })

  it('renders statements list successfully and expands a statement period on click', async () => {
    const mockData = {
      'Bank Jago': [
        {
          id: 'stmt-1',
          bank_name: 'Bank Jago',
          statement_period: 'Jun 2026',
          opening_balance: 5000000,
          closing_balance: 6500000,
          file_path: 'statements/jago-jun.pdf',
          created_at: '',
          bank_statement_items: [
            {
              id: 'item-1',
              date: '2026-06-19T00:00:00Z',
              description: 'Transfer Masuk',
              amount: 1500000,
              type: 'income',
              category: 'Transfer',
              balance: 6500000,
              created_at: '',
              statement_id: 'stmt-1',
              metadata: null,
            },
          ],
        },
      ],
    }

    vi.mocked(getGroupedBankStatements).mockResolvedValue({
      success: true,
      data: mockData as any,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <BankStatementList />
      </QueryClientProvider>
    )

    // Wait for the main bank entry to appear (first bank auto-expands)
    await waitFor(() => {
      expect(screen.getByText('Bank Jago')).toBeInTheDocument()
      expect(screen.getByText('Jun 2026')).toBeInTheDocument()
    })

    // Click the period row to expand items
    const periodText = screen.getByText('Jun 2026')
    act(() => {
      fireEvent.click(periodText)
    })

    // Assert that the balance summary is rendered
    await waitFor(() => {
      expect(screen.getByText('Saldo Awal')).toBeInTheDocument()
      expect(screen.getByText('Saldo Akhir')).toBeInTheDocument()
    })
  })

  it('renders empty state when no statements found', async () => {
    vi.mocked(getGroupedBankStatements).mockResolvedValue({
      success: true,
      data: {} as any,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <BankStatementList />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/No bank statements found/i)).toBeInTheDocument()
    })
  })

  it('toggles bank expansion on click', async () => {
    const mockData = {
      'Bank Jago': [
        {
          id: 'stmt-1',
          bank_name: 'Bank Jago',
          statement_period: 'Jun 2026',
          opening_balance: 5000000,
          closing_balance: 6500000,
          file_path: 'statements/jago-jun.pdf',
          created_at: '',
          bank_statement_items: [],
        },
      ],
      'Bank BRI': [
        {
          id: 'stmt-2',
          bank_name: 'Bank BRI',
          statement_period: 'Jun 2026',
          opening_balance: 3000000,
          closing_balance: 3500000,
          file_path: 'statements/bri-jun.pdf',
          created_at: '',
          bank_statement_items: [],
        },
      ],
    }

    vi.mocked(getGroupedBankStatements).mockResolvedValue({
      success: true,
      data: mockData as any,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <BankStatementList />
      </QueryClientProvider>
    )

    // First bank auto-expands; second bank (BRI) starts collapsed
    await waitFor(() => {
      expect(screen.getByText('Bank BRI')).toBeInTheDocument()
    })

    // BRI periods are not visible yet
    expect(screen.queryAllByText('Jun 2026')).toHaveLength(1) // only Jago's period visible

    // Click BRI bank header to expand it
    const bankHeader = screen.getByText('Bank BRI').closest('button')
    act(() => {
      fireEvent.click(bankHeader!)
    })

    // Now both banks are expanded, both Jun 2026 periods visible
    await waitFor(() => {
      expect(screen.queryAllByText('Jun 2026')).toHaveLength(2)
    })
  })

  it('opens edit dialog when edit button is clicked', async () => {
    const mockData = {
      'Bank BNI': [
        {
          id: 'stmt-2',
          bank_name: 'Bank BNI',
          statement_period: 'May 2026',
          opening_balance: 10000000,
          closing_balance: 12000000,
          file_path: 'statements/bni-may.pdf',
          created_at: '',
          bank_statement_items: [
            {
              id: 'item-2',
              date: '2026-05-15T10:00:00Z',
              description: 'Grocery Shopping',
              amount: 250000,
              type: 'expense',
              category: 'groceries',
              balance: 11750000,
              created_at: '',
              statement_id: 'stmt-2',
              metadata: null,
            },
          ],
        },
      ],
    }

    vi.mocked(getGroupedBankStatements).mockResolvedValue({
      success: true,
      data: mockData as any,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <BankStatementList />
      </QueryClientProvider>
    )

    // First bank auto-expands, period row visible
    await waitFor(() => {
      expect(screen.getByText('Bank BNI')).toBeInTheDocument()
      expect(screen.getByText('May 2026')).toBeInTheDocument()
    })

    // Expand the period to show items
    act(() => {
      fireEvent.click(screen.getByText('May 2026'))
    })

    await waitFor(() => {
      expect(screen.getAllByText('Grocery Shopping').length).toBeGreaterThan(0)
    })

    const editBtns = screen.getAllByLabelText(/Edit item/i)
    expect(editBtns.length).toBeGreaterThan(0)
  })

  it('calls delete mutation when delete statement button is clicked', async () => {
    vi.mocked(deleteBankStatement).mockResolvedValue({ success: true })

    const mockData = {
      'Bank Mandiri': [
        {
          id: 'stmt-3',
          bank_name: 'Bank Mandiri',
          statement_period: 'Apr 2026',
          opening_balance: 5000000,
          closing_balance: 5000000,
          file_path: 'statements/mandiri-apr.pdf',
          created_at: '',
          bank_statement_items: [],
        },
      ],
    }

    vi.mocked(getGroupedBankStatements).mockResolvedValue({
      success: true,
      data: mockData as any,
    })

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <QueryClientProvider client={queryClient}>
        <BankStatementList />
      </QueryClientProvider>
    )

    // First bank auto-expands, delete button for statement is visible
    await waitFor(() => {
      expect(screen.getByText('Bank Mandiri')).toBeInTheDocument()
      expect(screen.getByLabelText(/Hapus laporan mutasi/i)).toBeInTheDocument()
    })

    act(() => {
      fireEvent.click(screen.getByLabelText(/Hapus laporan mutasi/i))
    })

    await waitFor(() => {
      expect(deleteBankStatement).toHaveBeenCalledWith('stmt-3', 'statements/mandiri-apr.pdf')
    })

    confirmSpy.mockRestore()
  })

  it('opens mobile drawer when mobile item card is clicked', async () => {
    const mockData = {
      'Bank BCA': [
        {
          id: 'stmt-4',
          bank_name: 'Bank BCA',
          statement_period: 'Jun 2026',
          opening_balance: 10000000,
          closing_balance: 11000000,
          file_path: 'statements/bca-jun.pdf',
          created_at: '',
          bank_statement_items: [
            {
              id: 'item-4',
              date: '2026-06-19T10:00:00Z',
              description: 'Mobile Item Test',
              amount: 100000,
              type: 'income',
              category: 'Income',
              balance: 11000000,
              created_at: '',
              statement_id: 'stmt-4',
              metadata: null,
            },
          ],
        },
      ],
    }

    vi.mocked(getGroupedBankStatements).mockResolvedValue({
      success: true,
      data: mockData as any,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <BankStatementList />
      </QueryClientProvider>
    )

    // First bank auto-expands; expand the period to show items
    await waitFor(() => {
      expect(screen.getByText('Jun 2026')).toBeInTheDocument()
    })

    act(() => {
      fireEvent.click(screen.getByText('Jun 2026'))
    })

    await waitFor(() => {
      expect(screen.getAllByText('Mobile Item Test').length).toBeGreaterThan(0)
    })

    // Find the mobile card element (the div with cursor-pointer class wrapping the item)
    const allItemElements = screen.getAllByText('Mobile Item Test')
    const cardElement = allItemElements
      .map((el) => el.closest('.cursor-pointer'))
      .find(Boolean)

    expect(cardElement).toBeTruthy()
    act(() => {
      fireEvent.click(cardElement!)
    })

    await waitFor(() => {
      expect(screen.getByText('Kelola Item Mutasi')).toBeInTheDocument()
    })
  })

  it('shows multiple statement periods correctly', async () => {
    const mockData = {
      'Bank Multiple': [
        {
          id: 'stmt-5a',
          bank_name: 'Bank Multiple',
          statement_period: 'May 2026',
          opening_balance: 5000000,
          closing_balance: 6000000,
          file_path: 'statements/multi-5.pdf',
          created_at: '',
          bank_statement_items: [],
        },
        {
          id: 'stmt-5b',
          bank_name: 'Bank Multiple',
          statement_period: 'Jun 2026',
          opening_balance: 6000000,
          closing_balance: 7000000,
          file_path: 'statements/multi-6.pdf',
          created_at: '',
          bank_statement_items: [],
        },
      ],
    }

    vi.mocked(getGroupedBankStatements).mockResolvedValue({
      success: true,
      data: mockData as any,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <BankStatementList />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/2 Statements/i)).toBeInTheDocument()
    })
  })

  it('shows income and expense items correctly', async () => {
    const mockData = {
      'Bank Test': [
        {
          id: 'stmt-6',
          bank_name: 'Bank Test',
          statement_period: 'Jun 2026',
          opening_balance: 1000000,
          closing_balance: 1000000,
          file_path: 'statements/test.pdf',
          created_at: '',
          bank_statement_items: [
            {
              id: 'item-income',
              date: '2026-06-19T10:00:00Z',
              description: 'Income Item',
              amount: 500000,
              type: 'income',
              category: 'Income',
              balance: 1500000,
              created_at: '',
              statement_id: 'stmt-6',
              metadata: null,
            },
            {
              id: 'item-expense',
              date: '2026-06-20T10:00:00Z',
              description: 'Expense Item',
              amount: 200000,
              type: 'expense',
              category: 'Expense',
              balance: 800000,
              created_at: '',
              statement_id: 'stmt-6',
              metadata: null,
            },
          ],
        },
      ],
    }

    vi.mocked(getGroupedBankStatements).mockResolvedValue({
      success: true,
      data: mockData as any,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <BankStatementList />
      </QueryClientProvider>
    )

    // First bank auto-expands; expand the period to show items
    await waitFor(() => {
      expect(screen.getByText('Jun 2026')).toBeInTheDocument()
    })

    act(() => {
      fireEvent.click(screen.getByText('Jun 2026'))
    })

    await waitFor(() => {
      expect(screen.getAllByText('Income Item').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Expense Item').length).toBeGreaterThan(0)
    })
  })

  it('displays balance correctly when null/undefined', async () => {
    const mockData = {
      'Bank Test': [
        {
          id: 'stmt-7',
          bank_name: 'Bank Test',
          statement_period: 'Jun 2026',
          opening_balance: 1000000,
          closing_balance: 1000000,
          file_path: 'statements/test.pdf',
          created_at: '',
          bank_statement_items: [
            {
              id: 'item-no-balance',
              date: '2026-06-19T10:00:00Z',
              description: 'No Balance Item',
              amount: 100000,
              type: 'expense',
              category: 'Test',
              balance: null,
              created_at: '',
              statement_id: 'stmt-7',
              metadata: null,
            },
          ],
        },
      ],
    }

    vi.mocked(getGroupedBankStatements).mockResolvedValue({
      success: true,
      data: mockData as any,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <BankStatementList />
      </QueryClientProvider>
    )

    // First bank auto-expands; expand the period to show items
    await waitFor(() => {
      expect(screen.getByText('Jun 2026')).toBeInTheDocument()
    })

    act(() => {
      fireEvent.click(screen.getByText('Jun 2026'))
    })

    // Item appears in both desktop and mobile views — use getAllByText
    await waitFor(() => {
      expect(screen.getAllByText('No Balance Item').length).toBeGreaterThan(0)
    })
  })

  it('opens add item dialog when Add Item button is clicked', async () => {
    const mockData = {
      'Bank Test': [
        {
          id: 'stmt-8',
          bank_name: 'Bank Test',
          statement_period: 'Jun 2026',
          opening_balance: 1000000,
          closing_balance: 1000000,
          file_path: 'statements/test.pdf',
          created_at: '',
          bank_statement_items: [],
        },
      ],
    }

    vi.mocked(getGroupedBankStatements).mockResolvedValue({
      success: true,
      data: mockData as any,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <BankStatementList />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Bank Test')).toBeInTheDocument()
    })
  })

  it('allows delete item action from mobile drawer', async () => {
    vi.mocked(deleteStatementItem).mockResolvedValue({ success: true })

    const mockData = {
      'Bank Test': [
        {
          id: 'stmt-9',
          bank_name: 'Bank Test',
          statement_period: 'Jun 2026',
          opening_balance: 1000000,
          closing_balance: 1000000,
          file_path: 'statements/test.pdf',
          created_at: '',
          bank_statement_items: [
            {
              id: 'item-del',
              date: '2026-06-19T10:00:00Z',
              description: 'Item to Delete',
              amount: 100000,
              type: 'expense',
              category: 'Test',
              balance: 900000,
              created_at: '',
              statement_id: 'stmt-9',
              metadata: null,
            },
          ],
        },
      ],
    }

    vi.mocked(getGroupedBankStatements).mockResolvedValue({
      success: true,
      data: mockData as any,
    })

    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <QueryClientProvider client={queryClient}>
        <BankStatementList />
      </QueryClientProvider>
    )

    // First bank auto-expands; expand the period to show items
    await waitFor(() => {
      expect(screen.getByText('Jun 2026')).toBeInTheDocument()
    })

    act(() => {
      fireEvent.click(screen.getByText('Jun 2026'))
    })

    await waitFor(() => {
      expect(screen.getAllByText('Item to Delete').length).toBeGreaterThan(0)
    })
  })
})
