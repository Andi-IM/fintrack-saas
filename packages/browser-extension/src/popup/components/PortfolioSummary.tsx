interface PortfolioSummaryProps {
  totalValue: number
  totalCost: number
  totalGainLoss: number
  totalGainLossPct: number
  dayChange: number
  dayChangePct: number
}

export function PortfolioSummary({
  totalValue,
  totalCost,
  totalGainLoss,
  totalGainLossPct,
  dayChange,
  dayChangePct,
}: PortfolioSummaryProps) {
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
    <div className="portfolio-summary">
      <div className="summary-item">
        <span className="summary-label">Portfolio Value</span>
        <span className="summary-value">{formatCurrency(totalValue)}</span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Cost Basis</span>
        <span className="summary-value">{formatCurrency(totalCost)}</span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Total Gain/Loss</span>
        <span className={`summary-value ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{formatCurrency(totalGainLoss)} ({isPositive ? '+' : ''}{totalGainLossPct.toFixed(2)}%)
        </span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Today's Change</span>
        <span className={`summary-value ${dayIsPositive ? 'positive' : 'negative'}`}>
          {dayIsPositive ? '+' : ''}{formatCurrency(dayChange)} ({dayIsPositive ? '+' : ''}{dayChangePct.toFixed(2)}%)
        </span>
      </div>
    </div>
  )
}