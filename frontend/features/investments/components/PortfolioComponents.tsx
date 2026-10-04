'use client'

import { useQuery } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/utils/transaction'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight } from 'lucide-react'

interface InvestmentOverview {
  totalValue: number
  totalCost: number
  totalGainLoss: number
  totalGainLossPct: number
  dayChange: number
  dayChangePct: number
  accounts: Array<{
    id: string
    name: string
    type: string
    broker: string | null
    currency: string
    totalValue: number
    totalCost: number
    gainLoss: number
    gainLossPct: number
    holdingsCount: number
  }>
  topHoldings: Array<{
    id: string
    accountId: string
    accountName: string
    symbol: string
    name: string
    assetClass: string
    quantity: number
    avgBuyPrice: number | null
    currentPrice: number | null
    currency: string
    marketValue: number
    costBasis: number
    gainLoss: number
    gainLossPct: number
  }>
}

async function fetchInvestmentOverview(): Promise<InvestmentOverview> {
  const response = await fetch('/api/investments/overview')
  if (!response.ok) throw new Error('Failed to fetch investment overview')
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

export function PortfolioSummaryCards() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['investment-overview'],
    queryFn: fetchInvestmentOverview,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-24">
            <CardContent className="flex items-center justify-center h-full">
              <Skeleton className="w-3/4 h-10" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-4 text-center text-destructive">
          Failed to load portfolio summary
        </CardContent>
      </Card>
    )
  }

  const { totalValue, totalCost, totalGainLoss, totalGainLossPct, dayChange, dayChangePct } = data
  const isPositive = totalGainLoss >= 0
  const dayIsPositive = dayChange >= 0

  const cards = [
    {
      title: 'Total Portfolio Value',
      value: formatCurrency(totalValue),
      subtitle: `${isPositive ? '+' : ''}${totalGainLossPct.toFixed(2)}% (${formatCurrency(totalGainLoss)})`,
      subtitleClass: `text-${isPositive ? 'green' : 'red'}-600 dark:text-${isPositive ? 'green' : 'red'}-400`,
      icon: Wallet,
      iconClass: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      title: 'Total Cost Basis',
      value: formatCurrency(totalCost),
      subtitle: 'Amount invested',
      subtitleClass: 'text-muted-foreground',
      icon: ArrowUpRight,
      iconClass: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: "Today's Change",
      value: `${dayIsPositive ? '+' : ''}${dayChangePct.toFixed(2)}%`,
      subtitle: `${dayIsPositive ? '+' : ''}${formatCurrency(dayChange)}`,
      subtitleClass: `text-${dayIsPositive ? 'green' : 'red'}-600 dark:text-${dayIsPositive ? 'green' : 'red'}-400`,
      icon: dayIsPositive ? TrendingUp : TrendingDown,
      iconClass: `text-${dayIsPositive ? 'green' : 'red'}-600 dark:text-${dayIsPositive ? 'green' : 'red'}-400`,
    },
    {
      title: 'Total Gain/Loss',
      value: `${isPositive ? '+' : ''}${totalGainLossPct.toFixed(2)}%`,
      subtitle: formatCurrency(totalGainLoss),
      subtitleClass: `text-${isPositive ? 'green' : 'red'}-600 dark:text-${isPositive ? 'green' : 'red'}-400`,
      icon: isPositive ? TrendingUp : TrendingDown,
      iconClass: `text-${isPositive ? 'green' : 'red'}-600 dark:text-${isPositive ? 'green' : 'red'}-400`,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <card.icon className={`w-4 h-4 ${card.iconClass}`} />
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{card.value}</div>
            <div className={`text-sm font-medium ${card.subtitleClass}`}>{card.subtitle}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function PortfolioSummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="h-24">
          <CardContent className="flex flex-col items-start justify-center gap-2 h-full p-4">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-32 h-8" />
            <Skeleton className="w-20 h-4" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface AccountSummaryCardProps {
  account: InvestmentOverview['accounts'][0]
}

export function AccountSummaryCard({ account }: AccountSummaryCardProps) {
  const isPositive = account.gainLoss >= 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{account.name}</CardTitle>
          <Badge variant="secondary" className="gap-1">
            {account.type}
            {account.broker && (
              <>
                <span className="text-xs">·</span>
                <span className="text-xs">{account.broker}</span>
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tabular-nums">
            {formatCurrency(account.totalValue)}
          </span>
          <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositive ? '+' : ''}{account.gainLossPct.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Cost: {formatCurrency(account.totalCost)}</span>
          <span>{account.holdingsCount} holdings</span>
        </div>
        <div className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isPositive ? '+' : ''}{formatCurrency(account.gainLoss)}
        </div>
      </CardContent>
    </Card>
  )
}

interface HoldingRowProps {
  holding: InvestmentOverview['topHoldings'][0]
  rank?: number
}

export function HoldingRow({ holding, rank }: HoldingRowProps) {
  const isPositive = holding.gainLoss >= 0

  return (
    <tr className="border-b border-border/50 hover:bg-accent/50 transition-colors">
      <td className="py-3 px-4 text-muted-foreground text-sm">{rank}</td>
      <td className="py-3 px-4">
        <div className="font-medium">{holding.symbol}</div>
        <div className="text-xs text-muted-foreground">{holding.name}</div>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{holding.assetClass}</td>
      <td className="py-3 px-4 text-sm tabular-nums">{holding.quantity.toLocaleString()}</td>
      <td className="py-3 px-4 text-sm tabular-nums">
        {holding.currentPrice ? formatCurrency(holding.currentPrice) : '—'}
      </td>
      <td className="py-3 px-4 text-sm tabular-nums font-medium">
        {formatCurrency(holding.marketValue)}
      </td>
      <td className="py-3 px-4 text-sm tabular-nums">
        {formatCurrency(holding.gainLoss)}
      </td>
      <td className={`py-3 px-4 text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? '+' : ''}{holding.gainLossPct.toFixed(2)}%
      </td>
      <td className="py-3 px-4 text-xs text-muted-foreground">{holding.accountName}</td>
    </tr>
  )
}

export function HoldingsTable({ holdings }: { holdings: InvestmentOverview['topHoldings'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <th className="py-2 px-4">#</th>
            <th className="py-2 px-4">Symbol</th>
            <th className="py-2 px-4">Asset Class</th>
            <th className="py-2 px-4 text-right">Qty</th>
            <th className="py-2 px-4 text-right">Price</th>
            <th className="py-2 px-4 text-right">Value</th>
            <th className="py-2 px-4 text-right">Gain/Loss</th>
            <th className="py-2 px-4 text-right">%</th>
            <th className="py-2 px-4">Account</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding, i) => (
            <HoldingRow key={holding.id} holding={holding} rank={i + 1} />
          ))}
        </tbody>
      </table>
    </div>
  )
}