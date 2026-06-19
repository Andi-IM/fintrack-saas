import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import BankStatementList from '../BankStatementList'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getGroupedBankStatements } from '@/lib/actions/statements'

// Mock actions
vi.mock('@/lib/actions/statements', () => ({
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
          user_id: 'user-1',
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

    // Wait for the main bank entry to appear
    await waitFor(() => {
      expect(screen.getByText('Bank Jago')).toBeInTheDocument()
      expect(screen.getByText('Jun 2026')).toBeInTheDocument()
    })

    // Click the period text to expand
    const periodText = screen.getByText('Jun 2026')
    act(() => {
      fireEvent.click(periodText)
    })

    // Assert that the items list container is rendered
    await waitFor(() => {
      expect(screen.getByText('Saldo Awal')).toBeInTheDocument()
      expect(screen.getByText('Saldo Akhir')).toBeInTheDocument()
    })
  })
})
