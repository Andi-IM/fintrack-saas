'use server'

import { z } from 'zod'
import { invalidateCache } from '@/lib/cache'
import { getInvestmentRepository } from '@/lib/repositories/investments'
import { createClient } from '@/lib/supabase/server'
import { ActionResponse } from '@/lib/actions/types'
import type {
  InvestmentOverview,
  InvestmentAccountSummary,
  HoldingWithValue,
} from '@/lib/repositories/types'
import type { Json } from '@/lib/database.types'

// ─── Types ───

export interface InvestmentOverviewResponse extends InvestmentOverview {}

export interface AccountWithHoldings extends InvestmentAccountSummary {
  holdings: HoldingWithValue[]
}

// ─── Validation Schemas ───

const investmentAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['stock', 'mutual_fund', 'crypto', 'gold', 'other']),
  broker: z.string().max(100).optional(),
  currency: z.string().length(3).default('IDR'),
})

const investmentHoldingSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  symbol: z.string().min(1, 'Symbol is required').max(20).toUpperCase(),
  name: z.string().min(1, 'Name is required').max(200),
  assetClass: z.enum(['equity', 'fixed_income', 'crypto', 'commodity', 'cash', 'other']),
  quantity: z.number().positive('Quantity must be positive'),
  avgBuyPrice: z.number().positive('Average buy price must be positive').optional(),
  currency: z.string().length(3).default('IDR'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const investmentTransactionSchema = z.object({
  holdingId: z.string().uuid('Invalid holding ID'),
  type: z.enum([
    'buy', 'sell', 'dividend', 'split', 'merge',
    'transfer_in', 'transfer_out', 'fee', 'interest',
    'staking_reward', 'airdrop'
  ]),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  fees: z.number().min(0).default(0),
  taxes: z.number().min(0).default(0),
  transactionDate: z.string().datetime('Invalid transaction date'),
  settlementDate: z.string().datetime('Invalid settlement date').optional(),
  notes: z.string().max(1000).optional(),
  externalId: z.string().max(100).optional(),
})

// ─── Analytics ───

export async function getInvestmentOverview(): Promise<ActionResponse<InvestmentOverviewResponse>> {
  const repo = getInvestmentRepository()
  try {
    const overview = await repo.getInvestmentOverview()
    return { success: true, data: overview }
  } catch (error: any) {
    console.error('Error fetching investment overview:', error)
    return { success: false, error: 'Failed to fetch investment overview' }
  }
}

export async function getAccountWithHoldings(accountId: string): Promise<ActionResponse<AccountWithHoldings>> {
  const repo = getInvestmentRepository()
  try {
    const [account, holdings] = await Promise.all([
      repo.findAccountById(accountId),
      repo.findHoldingsByAccount(accountId),
    ])

    if (!account) {
      return { success: false, error: 'Account not found' }
    }

    // Enrich holdings with latest prices
    const enrichedHoldings: HoldingWithValue[] = []
    for (const holding of holdings) {
      const latestPrice = await repo.findLatestPrice(holding.symbol, holding.asset_class)
      const currentPrice = latestPrice?.price ?? null
      const marketValue = holding.quantity * (currentPrice ?? holding.avg_buy_price ?? 0)
      const costBasis = holding.quantity * (holding.avg_buy_price ?? 0)
      const gainLoss = marketValue - costBasis
      const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

      enrichedHoldings.push({
        id: holding.id,
        accountId: account.id,
        accountName: account.name,
        symbol: holding.symbol,
        name: holding.name,
        assetClass: holding.asset_class,
        quantity: holding.quantity,
        avgBuyPrice: holding.avg_buy_price,
        currentPrice,
        currency: holding.currency,
        marketValue,
        costBasis,
        gainLoss,
        gainLossPct,
      })
    }

    const totalValue = enrichedHoldings.reduce((sum, h) => sum + h.marketValue, 0)
    const totalCost = enrichedHoldings.reduce((sum, h) => sum + h.costBasis, 0)
    const gainLoss = totalValue - totalCost
    const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0

    return {
      success: true,
      data: {
        id: account.id,
        name: account.name,
        type: account.type,
        broker: account.broker,
        currency: account.currency,
        totalValue,
        totalCost,
        gainLoss,
        gainLossPct,
        holdingsCount: enrichedHoldings.length,
        holdings: enrichedHoldings,
      },
    }
  } catch (error: any) {
    console.error('Error fetching account with holdings:', error)
    return { success: false, error: 'Failed to fetch account details' }
  }
}

// ─── Account CRUD ───

export async function createInvestmentAccount(
  input: z.input<typeof investmentAccountSchema>
): Promise<ActionResponse<{ accountId: string }>> {
  const parsed = investmentAccountSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const repo = getInvestmentRepository()
  try {
    const account = await repo.createAccount({
      ...parsed.data,
      broker: parsed.data.broker ?? null,
    })
    invalidateCache(['/investments'])
    return { success: true, data: { accountId: account.id } }
  } catch (error: any) {
    console.error('Error creating investment account:', error)
    return { success: false, error: error.message || 'Failed to create investment account' }
  }
}

export async function updateInvestmentAccount(
  id: string,
  input: z.input<typeof investmentAccountSchema>
): Promise<ActionResponse<void>> {
  const parsed = investmentAccountSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const repo = getInvestmentRepository()
  try {
    await repo.updateAccount(id, {
      ...parsed.data,
      broker: parsed.data.broker ?? null,
    })
    invalidateCache(['/investments'])
    return { success: true }
  } catch (error: any) {
    console.error('Error updating investment account:', error)
    return { success: false, error: 'Failed to update investment account' }
  }
}

export async function deleteInvestmentAccount(id: string): Promise<ActionResponse<void>> {
  const repo = getInvestmentRepository()
  try {
    await repo.deleteAccount(id)
    invalidateCache(['/investments'])
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting investment account:', error)
    return { success: false, error: 'Failed to delete investment account' }
  }
}

// ─── Holding CRUD ───

export async function createHolding(
  input: z.input<typeof investmentHoldingSchema>
): Promise<ActionResponse<{ holdingId: string }>> {
  const parsed = investmentHoldingSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const repo = getInvestmentRepository()
  try {
    const holding = await repo.createHolding({
      account_id: parsed.data.accountId,
      symbol: parsed.data.symbol,
      name: parsed.data.name,
      asset_class: parsed.data.assetClass,
      quantity: parsed.data.quantity,
      avg_buy_price: parsed.data.avgBuyPrice ?? null,
      currency: parsed.data.currency,
      metadata: (parsed.data.metadata ?? {}) as Json,
    })
    invalidateCache(['/investments'])
    return { success: true, data: { holdingId: holding.id } }
  } catch (error: any) {
    console.error('Error creating holding:', error)
    return { success: false, error: error.message || 'Failed to create holding' }
  }
}

export async function updateHolding(
  id: string,
  input: z.input<typeof investmentHoldingSchema>
): Promise<ActionResponse<void>> {
  const parsed = investmentHoldingSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const repo = getInvestmentRepository()
  try {
    await repo.updateHolding(id, {
      account_id: parsed.data.accountId,
      symbol: parsed.data.symbol,
      name: parsed.data.name,
      asset_class: parsed.data.assetClass,
      quantity: parsed.data.quantity,
      avg_buy_price: parsed.data.avgBuyPrice ?? null,
      currency: parsed.data.currency,
      metadata: (parsed.data.metadata ?? {}) as Json,
    })
    invalidateCache(['/investments'])
    return { success: true }
  } catch (error: any) {
    console.error('Error updating holding:', error)
    return { success: false, error: 'Failed to update holding' }
  }
}

export async function deleteHolding(id: string): Promise<ActionResponse<void>> {
  const repo = getInvestmentRepository()
  try {
    await repo.deleteHolding(id)
    invalidateCache(['/investments'])
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting holding:', error)
    return { success: false, error: 'Failed to delete holding' }
  }
}

export async function recalculateHoldingAvgPrice(holdingId: string): Promise<ActionResponse<number>> {
  const repo = getInvestmentRepository()
  try {
    const avgPrice = await repo.recalculateHoldingAvgPrice(holdingId)
    invalidateCache(['/investments'])
    return { success: true, data: avgPrice }
  } catch (error: any) {
    console.error('Error recalculating avg price:', error)
    return { success: false, error: 'Failed to recalculate average price' }
  }
}

// ─── Transaction CRUD ───

export async function createTransaction(
  input: z.input<typeof investmentTransactionSchema>
): Promise<ActionResponse<{ transactionId: string }>> {
  const parsed = investmentTransactionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const repo = getInvestmentRepository()
  try {
    const transaction = await repo.createTransaction({
      holding_id: parsed.data.holdingId,
      type: parsed.data.type,
      quantity: parsed.data.quantity,
      price: parsed.data.price,
      fees: parsed.data.fees,
      taxes: parsed.data.taxes,
      transaction_date: parsed.data.transactionDate,
      settlement_date: parsed.data.settlementDate ?? null,
      notes: parsed.data.notes ?? null,
      external_id: parsed.data.externalId ?? null,
    })

    // Recalculate holding avg price after buy/transfer_in
    if (parsed.data.type === 'buy' || parsed.data.type === 'transfer_in') {
      await repo.recalculateHoldingAvgPrice(parsed.data.holdingId)
    }

    invalidateCache(['/investments'])
    return { success: true, data: { transactionId: transaction.id } }
  } catch (error: any) {
    console.error('Error creating transaction:', error)
    return { success: false, error: error.message || 'Failed to create transaction' }
  }
}

export async function updateTransaction(
  id: string,
  input: z.input<typeof investmentTransactionSchema>
): Promise<ActionResponse<void>> {
  const parsed = investmentTransactionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const repo = getInvestmentRepository()
  try {
    await repo.updateTransaction(id, {
      holding_id: parsed.data.holdingId,
      type: parsed.data.type,
      quantity: parsed.data.quantity,
      price: parsed.data.price,
      fees: parsed.data.fees,
      taxes: parsed.data.taxes,
      transaction_date: parsed.data.transactionDate,
      settlement_date: parsed.data.settlementDate ?? null,
      notes: parsed.data.notes ?? null,
      external_id: parsed.data.externalId ?? null,
    })

    // Recalculate holding avg price
    await repo.recalculateHoldingAvgPrice(parsed.data.holdingId)

    invalidateCache(['/investments'])
    return { success: true }
  } catch (error: any) {
    console.error('Error updating transaction:', error)
    return { success: false, error: 'Failed to update transaction' }
  }
}

export async function deleteTransaction(
  id: string,
  holdingId: string
): Promise<ActionResponse<void>> {
  const repo = getInvestmentRepository()
  try {
    await repo.deleteTransaction(id)
    await repo.recalculateHoldingAvgPrice(holdingId)
    invalidateCache(['/investments'])
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting transaction:', error)
    return { success: false, error: 'Failed to delete transaction' }
  }
}

// ─── Portfolio Snapshot ───

export async function refreshPortfolioSnapshot(): Promise<ActionResponse<{ snapshotDate: string }>> {
  const repo = getInvestmentRepository()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  try {
    const snapshot = await repo.refreshPortfolioSnapshot(user.id)
    invalidateCache(['/investments'])
    return { success: true, data: { snapshotDate: snapshot.snapshot_date } }
  } catch (error: any) {
    console.error('Error refreshing portfolio snapshot:', error)
    return { success: false, error: 'Failed to refresh portfolio snapshot' }
  }
}

// ─── Price Snapshots (for cron/service role) ───

export async function upsertPriceSnapshot(
  input: {
    symbol: string
    assetClass: string
    price: number
    currency: string
    source: string
    timestamp?: string
  }
): Promise<ActionResponse<void>> {
  const repo = getInvestmentRepository()
  try {
    await repo.upsertPriceSnapshot({
      symbol: input.symbol,
      asset_class: input.assetClass,
      price: input.price,
      currency: input.currency,
      source: input.source,
      timestamp: input.timestamp ?? new Date().toISOString(),
    })
    return { success: true }
  } catch (error: any) {
    console.error('Error upserting price snapshot:', error)
    return { success: false, error: 'Failed to save price snapshot' }
  }
}