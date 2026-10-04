import type { HoldingWithValue } from '../../shared/types'

interface TopHoldingsListProps {
  holdings: HoldingWithValue[]
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const ASSET_BADGE_CLASSES = {
  equity: 'equity',
  fixed_income: 'fixed_income',
  crypto: 'crypto',
  commodity: 'commodity',
  cash: 'cash',
  other: 'other',
}

export function TopHoldingsList({ holdings }: TopHoldingsListProps) {
  if (!holdings.length) return null

  return (
    <div className="holdings-list">
      {holdings.slice(0, 5).map((holding) => (
        <div key={holding.id} className="holding-row">
          <div className="holding-info">
            <div className="holding-symbol">{holding.symbol}</div>
            <div className="holding-name">{holding.name}</div>
          </div>
          <div className="holding-value">
            <div className="holding-market-value">{formatCurrency(holding.marketValue)}</div>
            <div className={`holding-gainloss ${holding.gainLoss >= 0 ? 'positive' : 'negative'}`}>
              {holding.gainLoss >= 0 ? '+' : ''}{formatCurrency(holding.gainLoss)} ({holding.gainLoss >= 0 ? '+' : ''}{holding.gainLossPct.toFixed(2)}%)
            </div>
          </div>
          <div className="holding-asset-class">
            <span className={`asset-badge ${ASSET_BADGE_CLASSES[holding.assetClass] || 'other'}`}>
              {holding.assetClass.replace('_', ' ')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}