interface PortfolioHeaderProps {
  totalValue: number
  totalGainLoss: number
  totalGainLossPct: number
  dayChange: number
  dayChangePct: number
  cached: boolean
}

export function PortfolioHeader({
  totalValue,
  totalGainLoss,
  totalGainLossPct,
  dayChange,
  dayChangePct,
  cached,
}: PortfolioHeaderProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const isPositive = totalGainLoss >= 0
  const dayIsPositive = dayChange >= 0

  return (
    <div className="portfolio-header">
      <div className="header-main">
        <div>
          <div className="header-title">FinTrack Portfolio</div>
          <div className="header-subtitle">
            Total Net Worth
            {cached && <span className="cached-badge">Cached</span>}
          </div>
        </div>
      </div>
      <div className="header-value">
        {formatCurrency(totalValue)}
      </div>
      <div className="header-change">
        <span className={isPositive ? 'change-positive' : 'change-negative'}>
          {isPositive ? '+' : ''}{formatCurrency(totalGainLoss)}
        </span>
        <span className={isPositive ? 'change-positive' : 'change-negative'}>
          ({isPositive ? '+' : ''}{totalGainLossPct.toFixed(2)}%)
        </span>
        <span className={dayIsPositive ? 'change-positive' : 'change-negative'}>
          {' '}Today: {dayIsPositive ? '+' : ''}{dayChangePct.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}