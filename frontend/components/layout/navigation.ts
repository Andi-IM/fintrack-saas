import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, FileText, Camera, Building2, TrendingUp } from 'lucide-react'

export type NavigationSection = 'dashboard' | 'transactions' | 'statements' | 'investments' | 'receipts'

export interface NavigationItem {
  section: NavigationSection
  label: string
  href: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavigationItem[] = [
  { section: 'dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { section: 'transactions', label: 'Transaksi', href: '/transactions', icon: FileText },
  { section: 'statements', label: 'Bank', href: '/statements', icon: Building2 },
  { section: 'investments', label: 'Investasi', href: '/investments', icon: TrendingUp },
  { section: 'receipts', label: 'Struk', href: '/receipts', icon: Camera },
]

export function getNavigationItem(section: NavigationSection): NavigationItem {
  return NAV_ITEMS.find((item) => item.section === section) ?? NAV_ITEMS[0]
}

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface NavigationContext {
  activeSection: NavigationSection
  breadcrumbs: BreadcrumbItem[]
}

type SearchParamsReader = Pick<URLSearchParams, 'get'>

function getParam(searchParams: SearchParamsReader | null | undefined, key: string): string | null {
  return searchParams?.get(key) ?? null
}

export function getNavigationContext(
  pathname: string | null,
  searchParams?: SearchParamsReader | null
): NavigationContext {
  const scan = getParam(searchParams, 'scan')
  const edit = getParam(searchParams, 'edit')
  const root: BreadcrumbItem = { label: 'Dashboard', href: '/' }

  if (pathname === '/') {
    return {
      activeSection: 'dashboard',
      breadcrumbs: [{ label: 'Dashboard' }],
    }
  }

  if (pathname?.startsWith('/statements')) {
    return {
      activeSection: 'statements',
      breadcrumbs: [root, { label: 'Bank' }],
    }
  }

  if (pathname?.startsWith('/receipts')) {
    return {
      activeSection: 'receipts',
      breadcrumbs: [root, { label: 'Struk' }],
    }
  }

  if (pathname === '/add' && scan === 'BankStatement') {
    return {
      activeSection: 'statements',
      breadcrumbs: [root, { label: 'Bank', href: '/statements' }, { label: 'Unggah Mutasi' }],
    }
  }

  if (pathname === '/add' && scan === 'Receipt') {
    return {
      activeSection: 'receipts',
      breadcrumbs: [root, { label: 'Struk', href: '/receipts' }, { label: 'Pindai Struk' }],
    }
  }

  if (pathname?.startsWith('/investments')) {
    if (pathname === '/investments') {
      return {
        activeSection: 'investments',
        breadcrumbs: [root, { label: 'Investasi' }],
      }
    }

    const isNewAccount = pathname === '/investments/accounts/new'
    const isAccounts = pathname.startsWith('/investments/accounts')
    const isHoldings = pathname.startsWith('/investments/holdings')
    const isTransactions = pathname.startsWith('/investments/transactions')
    const isSettings = pathname.startsWith('/investments/settings')

    const breadcrumbs: BreadcrumbItem[] = [root, { label: 'Investasi', href: '/investments' }]

    if (isNewAccount) {
      breadcrumbs.push({ label: 'Akun', href: '/investments/accounts' })
      breadcrumbs.push({ label: 'Akun Baru' })
    } else if (isAccounts) {
      breadcrumbs.push({ label: 'Akun' })
    } else if (isHoldings) {
      breadcrumbs.push({ label: 'Kepemilikan' })
    } else if (isTransactions) {
      breadcrumbs.push({ label: 'Transaksi' })
    } else if (isSettings) {
      breadcrumbs.push({ label: 'Pengaturan' })
    }

    return {
      activeSection: 'investments',
      breadcrumbs,
    }
  }

  if (pathname?.startsWith('/transactions')) {
    return {
      activeSection: 'transactions',
      breadcrumbs: [root, { label: 'Transaksi' }],
    }
  }

  if (pathname === '/add') {
    return {
      activeSection: 'transactions',
      breadcrumbs: [root, { label: 'Transaksi', href: '/transactions' }, { label: edit ? 'Ubah Transaksi' : 'Tambah Transaksi' }],
    }
  }

  return {
    activeSection: 'dashboard',
    breadcrumbs: [root],
  }
}
