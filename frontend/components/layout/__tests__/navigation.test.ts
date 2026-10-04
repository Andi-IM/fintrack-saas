import { describe, expect, it } from 'vitest'
import { getNavigationContext } from '@/components/layout/navigation'

describe('getNavigationContext', () => {
  it('keeps bank statement upload under Bank navigation', () => {
    const context = getNavigationContext('/add', new URLSearchParams({ scan: 'BankStatement' }))

    expect(context.activeSection).toBe('statements')
    expect(context.breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Bank', href: '/statements' },
      { label: 'Unggah Mutasi' },
    ])
  })

  it('keeps receipt scan under Struk navigation', () => {
    const context = getNavigationContext('/add', new URLSearchParams({ scan: 'Receipt' }))

    expect(context.activeSection).toBe('receipts')
    expect(context.breadcrumbs.at(-1)).toEqual({ label: 'Pindai Struk' })
  })

  it('keeps manual and edit entry under Transaksi navigation', () => {
    expect(getNavigationContext('/add').activeSection).toBe('transactions')

    const editContext = getNavigationContext('/add', new URLSearchParams({ edit: 'cash-flow-1' }))
    expect(editContext.activeSection).toBe('transactions')
    expect(editContext.breadcrumbs.at(-1)).toEqual({ label: 'Ubah Transaksi' })
  })

  it('shows only the Transaksi breadcrumb on the transactions list route', () => {
    expect(getNavigationContext('/transactions').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Transaksi' },
    ])
  })

  it('keeps investments section and nested breadcrumbs under Investasi navigation', () => {
    expect(getNavigationContext('/investments').activeSection).toBe('investments')
    expect(getNavigationContext('/investments').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Investasi' },
    ])

    expect(getNavigationContext('/investments/accounts').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Investasi', href: '/investments' },
      { label: 'Akun' },
    ])

    expect(getNavigationContext('/investments/accounts/new').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Investasi', href: '/investments' },
      { label: 'Akun', href: '/investments/accounts' },
      { label: 'Akun Baru' },
    ])

    expect(getNavigationContext('/investments/holdings').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Investasi', href: '/investments' },
      { label: 'Kepemilikan' },
    ])

    expect(getNavigationContext('/investments/transactions').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Investasi', href: '/investments' },
      { label: 'Transaksi' },
    ])

    expect(getNavigationContext('/investments/settings').breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Investasi', href: '/investments' },
      { label: 'Pengaturan' },
    ])
  })
})
