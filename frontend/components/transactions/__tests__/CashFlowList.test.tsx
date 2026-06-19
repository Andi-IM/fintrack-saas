import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CashFlowList } from '../CashFlowList'
import React from 'react'

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

describe('CashFlowList Component', () => {
  it('renders transactions successfully on desktop view', () => {
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)

    // Check descriptions are rendered (getAllByText since it renders in both Mobile card and Desktop table)
    expect(screen.getAllByText('Beli Kopi Susu')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Gaji Bulanan')[0]).toBeInTheDocument()

    // Check IDR formatted currencies are present
    expect(screen.getAllByText(/25\.000/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/10\.000\.000/)[0]).toBeInTheDocument()
  })

  it('renders categorized tags correctly', () => {
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)

    // Match exact text string instead of uppercase since it renders main_category directly
    expect(screen.getAllByText('Makanan & Minuman').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Gaji').length).toBeGreaterThan(0)
  })

  it('toggles mobile drawer on card tap', () => {
    render(<CashFlowList transactions={mockTransactions} timeRange="ALL" />)

    // Get the h4 containing 'Beli Kopi Susu' (which is the mobile card heading)
    const mobileHeading = screen.getAllByText('Beli Kopi Susu').find(el => el.tagName === 'H4')
    const cardElement = mobileHeading?.closest('.cursor-pointer')
    expect(cardElement).not.toBeNull()
    
    if (cardElement) {
      fireEvent.click(cardElement)
    }

    // Verify modal overlay title is rendered
    expect(screen.getByText('Kelola Transaksi')).toBeInTheDocument()
    expect(screen.getByText('Hapus Transaksi')).toBeInTheDocument()
  })
})
