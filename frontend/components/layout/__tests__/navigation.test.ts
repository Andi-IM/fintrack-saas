import { describe, expect, it } from 'vitest'
import { getNavigationContext } from '@/components/layout/navigation'

describe('getNavigationContext', () => {
  it('keeps bank statement upload under Bank Statements navigation', () => {
    const context = getNavigationContext('/add', new URLSearchParams({ scan: 'BankStatement' }))

    expect(context.activeSection).toBe('statements')
    expect(context.breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Bank Statements', href: '/statements' },
      { label: 'Upload Statement' },
    ])
  })

  it('keeps receipt scan under Receipts navigation', () => {
    const context = getNavigationContext('/add', new URLSearchParams({ scan: 'Receipt' }))

    expect(context.activeSection).toBe('receipts')
    expect(context.breadcrumbs.at(-1)).toEqual({ label: 'Scan Receipt' })
  })

  it('keeps manual and edit entry under Transactions navigation', () => {
    expect(getNavigationContext('/add').activeSection).toBe('transactions')

    const editContext = getNavigationContext('/add', new URLSearchParams({ edit: 'cash-flow-1' }))
    expect(editContext.activeSection).toBe('transactions')
    expect(editContext.breadcrumbs.at(-1)).toEqual({ label: 'Edit Transaction' })
  })

  it('shows only the Transactions breadcrumb on the transactions list route', () => {
    expect(getNavigationContext('/transactions').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Transactions' },
    ])
  })

  it('keeps investments section and nested breadcrumbs under Investments navigation', () => {
    expect(getNavigationContext('/investments').activeSection).toBe('investments')
    expect(getNavigationContext('/investments').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Investments' },
    ])

    expect(getNavigationContext('/investments/accounts').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Investments', href: '/investments' },
      { label: 'Accounts' },
    ])

    expect(getNavigationContext('/investments/accounts/new').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Investments', href: '/investments' },
      { label: 'Accounts', href: '/investments/accounts' },
      { label: 'New Account' },
    ])

    expect(getNavigationContext('/investments/holdings').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Investments', href: '/investments' },
      { label: 'Holdings' },
    ])

    expect(getNavigationContext('/investments/transactions').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Investments', href: '/investments' },
      { label: 'Transactions' },
    ])

    expect(getNavigationContext('/investments/settings').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Investments', href: '/investments' },
      { label: 'Settings' },
    ])
  })
})
