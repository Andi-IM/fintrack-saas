import { Tables, Json } from '@/lib/database.types'

declare const statementPeriodDateBrand: unique symbol

export type StatementPeriodDate = string & {
  readonly [statementPeriodDateBrand]: 'StatementPeriodDate'
}

export interface CashFlowFilterOptions {
  range?: string
  date?: string
  search?: string
  category?: string
  payment_method?: string
  source?: string
  page?: number
  limit?: number
  previous?: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  count: number
}

export type DashboardCashFlowEntry = Pick<
  Tables<'cash_flow'>,
  'id' | 'date' | 'main_category' | 'description' | 'income' | 'expense' | 'payment_method'
>

export const DASHBOARD_RANGES = ['TODAY', 'MTD', 'YTD', '1W', '1M', '3M', '1Y', 'ALL'] as const
export type DashboardRange = (typeof DASHBOARD_RANGES)[number]

/** Narrows an arbitrary string to DashboardRange, falling back to the supplied default. */
export function parseDashboardRange(value: string | undefined, fallback: DashboardRange = '1M'): DashboardRange {
  if (value !== undefined && (DASHBOARD_RANGES as readonly string[]).includes(value)) {
    return value as DashboardRange
  }
  return fallback
}

// Interface representing the cash flow database access layer
export interface CashFlowRepository {
  findAll(options?: CashFlowFilterOptions & { previous?: boolean }): Promise<PaginatedResult<Tables<'cash_flow'>>>
  findDashboardEntries(options?: { range?: DashboardRange; previous?: boolean }): Promise<DashboardCashFlowEntry[]>
  findById(id: string): Promise<Tables<'cash_flow'> | null>
  create(data: Omit<Tables<'cash_flow'>, 'id' | 'created_at' | 'user_id' | 'source_item_id' | 'transaction_time'> & { source_item_id?: string | null; transaction_time?: string | null }): Promise<Tables<'cash_flow'>>
  update(id: string, data: Partial<Omit<Tables<'cash_flow'>, 'id' | 'created_at' | 'user_id'>>): Promise<void>
  delete(id: string): Promise<void>
}

export interface StatementRepository {
  findAllWithItems(): Promise<Tables<'bank_statements'>[]>
  findById(id: string): Promise<Tables<'bank_statements'> | null>
  delete(id: string, filePath: string): Promise<void>

  save({
    bankName,
    statementPeriod,
    openingBalance,
    closingBalance,
    items,
    file,
  }: {
    bankName: string
    statementPeriod: StatementPeriodDate
    openingBalance: number | null
    closingBalance: number | null
    items: any[]
    file: File
  }): Promise<{ id: string }>

  insertItems(items: any[]): Promise<void>
  deleteItem(itemId: string): Promise<Tables<'bank_statement_items'> | null>
  updateItem(
    itemId: string,
    data: {
      date: string
      description: string
      amount: number
      type: string
      category?: string | null
      balance?: number | null
      metadata?: Record<string, unknown>
    }
  ): Promise<{ statementId: string }>
  addItem(data: {
    statement_id: string
    date: string
    description: string
    amount: number
    type: string
    category?: string | null
    balance?: number
  }): Promise<void>
  findItemsByStatementId(statementId: string): Promise<Tables<'bank_statement_items'>[]>
  updateItemBalance(itemId: string, balance: number): Promise<void>
  updateClosingBalance(itemId: string, closingBalance: number, totalItems: number): Promise<void>
  
  getSignedUrl(path: string): Promise<string>
  uploadFile(path: string, buffer: Buffer, contentType: string): Promise<void>
  removeFile(path: string): Promise<void>
  
  upload(path: string, buffer: Buffer, contentType: string): Promise<{ path: string }>
  remove(paths: string[]): Promise<void>

  checkExistingForBank(bankName: string): Promise<Pick<Tables<'bank_statements'>, 'id' | 'statement_period' | 'file_path'>[]>
}

export interface InvestmentAccount {
  id: string
  user_id: string
  name: string
  type: 'stock' | 'mutual_fund' | 'crypto' | 'gold' | 'other'
  broker: string | null
  currency: string
  created_at: string
  updated_at: string
}

export interface InvestmentHolding {
  id: string
  account_id: string
  user_id: string
  symbol: string
  name: string
  asset_class: 'equity' | 'fixed_income' | 'crypto' | 'commodity' | 'cash' | 'other'
  quantity: number
  avg_buy_price: number | null
  currency: string
  metadata: Json
  created_at: string
  updated_at: string
}

export interface InvestmentTransaction {
  id: string
  holding_id: string
  user_id: string
  type: 'buy' | 'sell' | 'dividend' | 'split' | 'merge' | 'transfer_in' | 'transfer_out' | 'fee' | 'interest' | 'staking_reward' | 'airdrop'
  quantity: number
  price: number
  fees: number
  taxes: number
  total_amount: number
  transaction_date: string
  settlement_date: string | null
  notes: string | null
  external_id: string | null
  created_at: string
  updated_at: string
}

export interface InvestmentPriceSnapshot {
  id: string
  symbol: string
  asset_class: string
  price: number
  currency: string
  source: string
  timestamp: string
}

export interface PortfolioSnapshot {
  id: string
  user_id: string
  total_value: number
  total_cost: number
  total_gain_loss: number
  total_gain_loss_pct: number
  day_change: number | null
  day_change_pct: number | null
  snapshot_date: string
  created_at: string
}

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

export interface AccountWithHoldings extends InvestmentAccountSummary {
  holdings: HoldingWithValue[]
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

export interface InvestmentRepository {
  // Accounts
  findAccounts(): Promise<InvestmentAccount[]>
  findAccountById(id: string): Promise<InvestmentAccount | null>
  createAccount(data: Omit<InvestmentAccount, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<InvestmentAccount>
  updateAccount(id: string, data: Partial<Omit<InvestmentAccount, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<void>
  deleteAccount(id: string): Promise<void>

  // Holdings
  findHoldingsByAccount(accountId: string): Promise<InvestmentHolding[]>
  findHoldingById(id: string): Promise<InvestmentHolding | null>
  createHolding(data: Omit<InvestmentHolding, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<InvestmentHolding>
  updateHolding(id: string, data: Partial<Omit<InvestmentHolding, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<void>
  deleteHolding(id: string): Promise<void>

  // Transactions
  findTransactionsByHolding(holdingId: string, limit?: number, offset?: number): Promise<InvestmentTransaction[]>
  findTransactionById(id: string): Promise<InvestmentTransaction | null>
  createTransaction(data: Omit<InvestmentTransaction, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'total_amount'>): Promise<InvestmentTransaction>
  updateTransaction(id: string, data: Partial<Omit<InvestmentTransaction, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'total_amount'>>): Promise<void>
  deleteTransaction(id: string): Promise<void>

  // Price Snapshots
  findLatestPrice(symbol: string, assetClass: string): Promise<InvestmentPriceSnapshot | null>
  findPriceHistory(symbol: string, assetClass: string, limit?: number): Promise<InvestmentPriceSnapshot[]>
  upsertPriceSnapshot(data: Omit<InvestmentPriceSnapshot, 'id'>): Promise<void>

  // Portfolio Snapshots
  findLatestPortfolioSnapshot(userId: string): Promise<PortfolioSnapshot | null>
  findPortfolioSnapshots(userId: string, limit?: number): Promise<PortfolioSnapshot[]>
  upsertPortfolioSnapshot(data: Omit<PortfolioSnapshot, 'id' | 'total_gain_loss' | 'total_gain_loss_pct'>): Promise<PortfolioSnapshot>

  // Analytics
  getInvestmentOverview(): Promise<InvestmentOverview>

  // RPC functions
  recalculateHoldingAvgPrice(holdingId: string): Promise<number>
  refreshPortfolioSnapshot(userId: string): Promise<PortfolioSnapshot>
}
