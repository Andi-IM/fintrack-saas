export type NavigationSection = 'dashboard' | 'transactions' | 'statements' | 'investments' | 'receipts'

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
      breadcrumbs: [root, { label: 'Bank Statements' }],
    }
  }

  if (pathname?.startsWith('/receipts')) {
    return {
      activeSection: 'receipts',
      breadcrumbs: [root, { label: 'Receipts' }],
    }
  }

  if (pathname === '/add' && scan === 'BankStatement') {
    return {
      activeSection: 'statements',
      breadcrumbs: [root, { label: 'Bank Statements', href: '/statements' }, { label: 'Upload Statement' }],
    }
  }

  if (pathname === '/add' && scan === 'Receipt') {
    return {
      activeSection: 'receipts',
      breadcrumbs: [root, { label: 'Receipts', href: '/receipts' }, { label: 'Scan Receipt' }],
    }
  }

  if (pathname?.startsWith('/investments')) {
    if (pathname === '/investments') {
      return {
        activeSection: 'investments',
        breadcrumbs: [root, { label: 'Investments' }],
      }
    }

    const isNewAccount = pathname === '/investments/accounts/new'
    const isAccounts = pathname.startsWith('/investments/accounts')
    const isHoldings = pathname.startsWith('/investments/holdings')
    const isTransactions = pathname.startsWith('/investments/transactions')
    const isSettings = pathname.startsWith('/investments/settings')

    const breadcrumbs: BreadcrumbItem[] = [root, { label: 'Investments', href: '/investments' }]

    if (isNewAccount) {
      breadcrumbs.push({ label: 'Accounts', href: '/investments/accounts' })
      breadcrumbs.push({ label: 'New Account' })
    } else if (isAccounts) {
      breadcrumbs.push({ label: 'Accounts' })
    } else if (isHoldings) {
      breadcrumbs.push({ label: 'Holdings' })
    } else if (isTransactions) {
      breadcrumbs.push({ label: 'Transactions' })
    } else if (isSettings) {
      breadcrumbs.push({ label: 'Settings' })
    }

    return {
      activeSection: 'investments',
      breadcrumbs,
    }
  }

  if (pathname?.startsWith('/transactions')) {
    return {
      activeSection: 'transactions',
      breadcrumbs: [root, { label: 'Transactions' }],
    }
  }

  if (pathname === '/add') {
    return {
      activeSection: 'transactions',
      breadcrumbs: [root, { label: 'Transactions', href: '/transactions' }, { label: edit ? 'Edit Transaction' : 'Add Transaction' }],
    }
  }

  return {
    activeSection: 'dashboard',
    breadcrumbs: [root],
  }
}
