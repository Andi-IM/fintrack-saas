import type { InvestmentAccountSummary } from '../../shared/types'

interface AccountsListProps {
  accounts: InvestmentAccountSummary[]
}

const TYPE_ICONS = {
  stock: '🏢',
  mutual_fund: '📊',
  crypto: '₿',
  gold: '🥇',
  other: '💼',
}

const TYPE_CLASSES = {
  stock: 'stock',
  mutual_fund: 'mutual_fund',
  crypto: 'crypto',
  gold: 'gold',
  other: 'other',
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function AccountsList({ accounts }: AccountsListProps) {
  if (!accounts.length) return null

  return (
    <div className="accounts-list">
      {accounts.map((account) => (
        <div key={account.id} className="account-card">
          <div className={`account-icon ${TYPE_CLASSES[account.type] || 'other'}`}>
            <span style={{ fontSize: '18px' }}>{TYPE_ICONS[account.type] || TYPE_ICONS.other}</span>
          </div>
          <div className="account-info">
            <div className="account-name">{account.name}</div>
            <div className="account-meta">
              <span className="account-type">{account.type.replace('_', ' ')}</span>
              {account.broker && <span className="account-broker">{account.broker}</span>}
            </div>
          </div>
          <div className="account-value">
            <div className="account-total">{formatCurrency(account.totalValue)}</div>
            <div className={`account-change ${account.gainLoss >= 0 ? 'positive' : 'negative'}`}>
              {account.gainLoss >= 0 ? '+' : ''}{account.gainLossPct.toFixed(2)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}