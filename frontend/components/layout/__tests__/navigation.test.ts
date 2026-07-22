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
})
