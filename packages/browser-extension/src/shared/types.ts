export interface InvestmentOverview {
  totalValue: number
  totalCost: number
  totalGainLoss: number
  totalGainLossPct: number
  dayChange: number
  dayChangePct: number
  accounts: InvestmentAccountSummary[]
  topHoldings: HoldingWithValue[]
}

export interface InvestmentAccountSummary {
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
}

export interface HoldingWithValue {
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
}

export interface ExtensionSettings {
  autoRefresh: boolean
  refreshInterval: number
  showGainLossColors: boolean
  notificationsEnabled: boolean
  priceAlerts: boolean
  dividendAlerts: boolean
}

export interface StoredAuth {
  accessToken: string
  refreshToken: string
  expiresAt: number
  userId: string
}

export { DEFAULT_SETTINGS } from './constants'