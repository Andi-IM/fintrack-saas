import { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import type {
  InvestmentRepository,
  InvestmentAccount,
  InvestmentHolding,
  InvestmentTransaction,
  InvestmentPriceSnapshot,
  PortfolioSnapshot,
  InvestmentOverview,
  InvestmentAccountSummary,
  HoldingWithValue,
} from '@/lib/repositories/types'

function toInvestmentAccount(row: Tables<'investment_accounts'>): InvestmentAccount {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type,
    broker: row.broker,
    currency: row.currency,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toInvestmentHolding(row: Tables<'investment_holdings'>): InvestmentHolding {
  return {
    id: row.id,
    account_id: row.account_id,
    user_id: row.user_id,
    symbol: row.symbol,
    name: row.name,
    asset_class: row.asset_class,
    quantity: row.quantity,
    avg_buy_price: row.avg_buy_price,
    currency: row.currency,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toInvestmentTransaction(row: Tables<'investment_transactions'>): InvestmentTransaction {
  return {
    id: row.id,
    holding_id: row.holding_id,
    user_id: row.user_id,
    type: row.type,
    quantity: row.quantity,
    price: row.price,
    fees: row.fees,
    taxes: row.taxes,
    total_amount: row.total_amount,
    transaction_date: row.transaction_date,
    settlement_date: row.settlement_date,
    notes: row.notes,
    external_id: row.external_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toInvestmentPriceSnapshot(row: Tables<'investment_price_snapshots'>): InvestmentPriceSnapshot {
  return {
    id: row.id,
    symbol: row.symbol,
    asset_class: row.asset_class,
    price: row.price,
    currency: row.currency,
    source: row.source,
    timestamp: row.timestamp,
  }
}

function toPortfolioSnapshot(row: Tables<'portfolio_snapshots'>): PortfolioSnapshot {
  return {
    id: row.id,
    user_id: row.user_id,
    total_value: row.total_value,
    total_cost: row.total_cost,
    total_gain_loss: row.total_gain_loss,
    total_gain_loss_pct: row.total_gain_loss_pct,
    day_change: row.day_change,
    day_change_pct: row.day_change_pct,
    snapshot_date: row.snapshot_date,
    created_at: row.created_at,
  }
}

export const investmentRepository: InvestmentRepository = {
  // ─── Accounts ───
  async findAccounts(): Promise<InvestmentAccount[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investment_accounts')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return (data || []).map(toInvestmentAccount)
  },

  async findAccountById(id: string): Promise<InvestmentAccount | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investment_accounts')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return toInvestmentAccount(data)
  },

  async createAccount(data: Omit<InvestmentAccount, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<InvestmentAccount> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: row, error } = await supabase
      .from('investment_accounts')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    
    if (error) throw error
    return toInvestmentAccount(row)
  },

  async updateAccount(id: string, data: Partial<Omit<InvestmentAccount, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('investment_accounts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  },

  async deleteAccount(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('investment_accounts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // ─── Holdings ───
  async findHoldingsByAccount(accountId: string): Promise<InvestmentHolding[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investment_holdings')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return (data || []).map(toInvestmentHolding)
  },

  async findHoldingById(id: string): Promise<InvestmentHolding | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investment_holdings')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return toInvestmentHolding(data)
  },

  async createHolding(data: Omit<InvestmentHolding, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<InvestmentHolding> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: row, error } = await supabase
      .from('investment_holdings')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    
    if (error) throw error
    return toInvestmentHolding(row)
  },

  async updateHolding(id: string, data: Partial<Omit<InvestmentHolding, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('investment_holdings')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  },

  async deleteHolding(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('investment_holdings')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // ─── Transactions ───
  async findTransactionsByHolding(holdingId: string, limit = 50, offset = 0): Promise<InvestmentTransaction[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investment_transactions')
      .select('*')
      .eq('holding_id', holdingId)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    return (data || []).map(toInvestmentTransaction)
  },

  async findTransactionById(id: string): Promise<InvestmentTransaction | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investment_transactions')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return toInvestmentTransaction(data)
  },

  async createTransaction(data: Omit<InvestmentTransaction, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'total_amount'>): Promise<InvestmentTransaction> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: row, error } = await supabase
      .from('investment_transactions')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    
    if (error) throw error
    return toInvestmentTransaction(row)
  },

  async updateTransaction(id: string, data: Partial<Omit<InvestmentTransaction, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'total_amount'>>): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('investment_transactions')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  },

  async deleteTransaction(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('investment_transactions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // ─── Price Snapshots ───
  async findLatestPrice(symbol: string, assetClass: string): Promise<InvestmentPriceSnapshot | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investment_price_snapshots')
      .select('*')
      .eq('symbol', symbol)
      .eq('asset_class', assetClass)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return toInvestmentPriceSnapshot(data)
  },

  async findPriceHistory(symbol: string, assetClass: string, limit = 100): Promise<InvestmentPriceSnapshot[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investment_price_snapshots')
      .select('*')
      .eq('symbol', symbol)
      .eq('asset_class', assetClass)
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return (data || []).map(toInvestmentPriceSnapshot)
  },

  async upsertPriceSnapshot(data: Omit<InvestmentPriceSnapshot, 'id'>): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('investment_price_snapshots')
      .upsert(data, { onConflict: 'symbol,asset_class,source,timestamp' })
    
    if (error) throw error
  },

  // ─── Portfolio Snapshots ───
  async findLatestPortfolioSnapshot(userId: string): Promise<PortfolioSnapshot | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return toPortfolioSnapshot(data)
  },

  async findPortfolioSnapshots(userId: string, limit = 365): Promise<PortfolioSnapshot[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return (data || []).map(toPortfolioSnapshot)
  },

  async upsertPortfolioSnapshot(data: Omit<PortfolioSnapshot, 'id' | 'total_gain_loss' | 'total_gain_loss_pct'>): Promise<PortfolioSnapshot> {
    const supabase = await createClient()
    const { data: row, error } = await supabase
      .from('portfolio_snapshots')
      .upsert(data, { onConflict: 'user_id,snapshot_date' })
      .select()
      .single()
    
    if (error) throw error
    return toPortfolioSnapshot(row)
  },

  // ─── Analytics ───
  async getInvestmentOverview(): Promise<InvestmentOverview> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Fetch accounts with holdings and latest prices
    const { data: accountsData, error: accountsError } = await supabase
      .from('investment_accounts')
      .select(`
        *,
        investment_holdings!inner(
          *,
          investment_price_snapshots!investment_price_snapshots_symbol_asset_class_source_timestamp_key(
            price
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (accountsError) throw accountsError

    // Fetch latest portfolio snapshot
    const latestSnapshot = await this.findLatestPortfolioSnapshot(user.id)

    const accounts: InvestmentAccountSummary[] = []
    const allHoldings: HoldingWithValue[] = []
    let totalValue = 0
    let totalCost = 0

    for (const account of accountsData || []) {
      const holdings = account.investment_holdings || []
      let accountValue = 0
      let accountCost = 0

      for (const holding of holdings) {
        const latestPrice = holding.investment_price_snapshots?.[0]?.price ?? null
        const marketValue = holding.quantity * (latestPrice ?? holding.avg_buy_price ?? 0)
        const costBasis = holding.quantity * (holding.avg_buy_price ?? 0)
        const gainLoss = marketValue - costBasis
        const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

        const holdingWithValue: HoldingWithValue = {
          id: holding.id,
          accountId: account.id,
          accountName: account.name,
          symbol: holding.symbol,
          name: holding.name,
          assetClass: holding.asset_class,
          quantity: holding.quantity,
          avgBuyPrice: holding.avg_buy_price,
          currentPrice: latestPrice,
          currency: holding.currency,
          marketValue,
          costBasis,
          gainLoss,
          gainLossPct,
        }

        allHoldings.push(holdingWithValue)
        accountValue += marketValue
        accountCost += costBasis
      }

      const gainLoss = accountValue - accountCost
      const gainLossPct = accountCost > 0 ? (gainLoss / accountCost) * 100 : 0

      accounts.push({
        id: account.id,
        name: account.name,
        type: account.type,
        broker: account.broker,
        currency: account.currency,
        totalValue: accountValue,
        totalCost: accountCost,
        gainLoss,
        gainLossPct,
        holdingsCount: holdings.length,
      })

      totalValue += accountValue
      totalCost += accountCost
    }

    const totalGainLoss = totalValue - totalCost
    const totalGainLossPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

    // Day change from latest snapshot
    const dayChange = latestSnapshot?.day_change ?? 0
    const dayChangePct = latestSnapshot?.day_change_pct ?? 0

    // Top 5 holdings by market value
    const topHoldings = [...allHoldings]
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 5)

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPct,
      dayChange,
      dayChangePct,
      accounts,
      topHoldings,
    }
  },

  // ─── RPC Functions ───
  async recalculateHoldingAvgPrice(holdingId: string): Promise<number> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('recalculate_holding_avg_price', {
      p_holding_id: holdingId,
    })
    
    if (error) throw error
    return data as number
  },

  async refreshPortfolioSnapshot(userId: string): Promise<PortfolioSnapshot> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('refresh_portfolio_snapshot', {
      p_user_id: userId,
    })
    
    if (error) throw error
    return toPortfolioSnapshot(data)
  },
}

export function getInvestmentRepository(): InvestmentRepository {
  return investmentRepository
}