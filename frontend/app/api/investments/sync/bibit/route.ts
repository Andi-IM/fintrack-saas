import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInvestmentRepository } from '@/lib/repositories/investments'
import { invalidateCache } from '@/lib/cache'
import { buildCorsHeaders, corsPreflightResponse } from '@/lib/cors'

export async function OPTIONS(req: Request) {
  return corsPreflightResponse(req)
}

interface BibitResultItem {
  id: number
  name: string
  marketvalue: number
  invested: number
  profitloss: number
  trading_balance?: number
  type?: {
    id?: number
    name?: string
  }
}

interface BibitSyncPayload {
  message?: string
  data: {
    marketvalue: number
    invested: number
    profitloss: number
    trading_balance?: number
    result: BibitResultItem[]
  }
}

const MAX_RESULT_ITEMS = 200
const MAX_AMOUNT = 1e15

function isFiniteAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_AMOUNT
}

function isValidPayload(body: unknown): body is BibitSyncPayload {
  if (!body || typeof body !== 'object') return false
  const data = (body as BibitSyncPayload).data
  if (!data || typeof data !== 'object') return false
  if (!Array.isArray(data.result) || data.result.length > MAX_RESULT_ITEMS) return false
  if (!isFiniteAmount(data.marketvalue)) return false
  if (!isFiniteAmount(data.invested)) return false
  if (!isFiniteAmount(data.profitloss)) return false
  if (data.trading_balance !== undefined && !isFiniteAmount(data.trading_balance)) return false

  return data.result.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      Number.isFinite(item.id) &&
      typeof item.name === 'string' &&
      item.name.length <= 200 &&
      isFiniteAmount(item.marketvalue) &&
      isFiniteAmount(item.invested) &&
      isFiniteAmount(item.profitloss)
  )
}

export async function POST(req: Request) {
  const corsHeaders = buildCorsHeaders(req.headers.get('origin'))
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please login to FinTrack first.' },
        { status: 401, headers: corsHeaders }
      )
    }

    const body: unknown = await req.json()
    if (!isValidPayload(body)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Bibit portfolio payload structure' },
        { status: 400, headers: corsHeaders }
      )
    }

    const repo = getInvestmentRepository()
    const existingAccounts = await repo.findAccounts()

    // 1. Process each portfolio bucket in result
    for (const item of body.data.result) {
      const accountName = `Bibit - ${item.name}`
      const isStock = item.type?.name?.toLowerCase().includes('saham') || item.name.toLowerCase().includes('saham')
      const accountType = isStock ? 'stock' : 'mutual_fund'

      let account = existingAccounts.find(
        (a) =>
          a.name.toLowerCase() === accountName.toLowerCase() ||
          (a.broker === 'Bibit' && a.name.toLowerCase().includes(item.name.toLowerCase()))
      )

      if (!account) {
        account = await repo.createAccount({
          name: accountName,
          type: accountType,
          broker: 'Bibit',
          currency: 'IDR',
        })
      }

      // Upsert holding for this portfolio bucket
      const existingHoldings = await repo.findHoldingsByAccount(account.id)
      const symbol = `BIBIT-${item.id}`
      const holding = existingHoldings.find((h) => h.symbol === symbol)

      const assetClass = isStock ? 'equity' : 'fixed_income'
      const avgBuyPrice = item.invested > 0 ? item.invested : null

      if (!holding) {
        if (item.marketvalue > 0 || item.invested > 0) {
          await repo.createHolding({
            account_id: account.id,
            symbol,
            name: `${item.name} (${item.type?.name || 'Bibit'})`,
            asset_class: assetClass,
            quantity: 1,
            avg_buy_price: avgBuyPrice,
            currency: 'IDR',
            metadata: {
              bibit_id: item.id,
              market_value: item.marketvalue,
              profit_loss: item.profitloss,
              last_synced_at: new Date().toISOString(),
            },
          })
          await repo.upsertPriceSnapshot({
            symbol,
            asset_class: assetClass,
            price: item.marketvalue,
            currency: 'IDR',
            source: 'bibit',
            timestamp: new Date().toISOString(),
          })
        }
      } else {
        await repo.updateHolding(holding.id, {
          account_id: account.id,
          symbol,
          name: `${item.name} (${item.type?.name || 'Bibit'})`,
          asset_class: assetClass,
          quantity: 1,
          avg_buy_price: avgBuyPrice,
          currency: 'IDR',
          metadata: {
            bibit_id: item.id,
            market_value: item.marketvalue,
            profit_loss: item.profitloss,
            last_synced_at: new Date().toISOString(),
          },
        })
        await repo.upsertPriceSnapshot({
          symbol,
          asset_class: assetClass,
          price: item.marketvalue,
          currency: 'IDR',
          source: 'bibit',
          timestamp: new Date().toISOString(),
        })
      }
    }

    // 2. If trading_balance (RDN cash) exists and > 0, sync RDN account
    if (body.data.trading_balance && body.data.trading_balance > 0) {
      const rdnName = 'Bibit - Saldo RDN (Cash)'
      let rdnAccount = existingAccounts.find((a) => a.name.toLowerCase() === rdnName.toLowerCase())
      if (!rdnAccount) {
        rdnAccount = await repo.createAccount({
          name: rdnName,
          type: 'other',
          broker: 'Bibit',
          currency: 'IDR',
        })
      }

      const existingHoldings = await repo.findHoldingsByAccount(rdnAccount.id)
      const rdnSymbol = 'BIBIT-RDN'
      const rdnHolding = existingHoldings.find((h) => h.symbol === rdnSymbol)

      if (!rdnHolding) {
        await repo.createHolding({
          account_id: rdnAccount.id,
          symbol: rdnSymbol,
          name: 'Saldo Rekening Dana Nasabah (RDN)',
          asset_class: 'cash',
          quantity: body.data.trading_balance,
          avg_buy_price: 1,
          currency: 'IDR',
          metadata: { last_synced_at: new Date().toISOString() },
        })
        await repo.upsertPriceSnapshot({
          symbol: rdnSymbol,
          asset_class: 'cash',
          price: 1,
          currency: 'IDR',
          source: 'bibit',
          timestamp: new Date().toISOString(),
        })
      } else {
        await repo.updateHolding(rdnHolding.id, {
          account_id: rdnAccount.id,
          symbol: rdnSymbol,
          name: 'Saldo Rekening Dana Nasabah (RDN)',
          asset_class: 'cash',
          quantity: body.data.trading_balance,
          avg_buy_price: 1,
          currency: 'IDR',
          metadata: { last_synced_at: new Date().toISOString() },
        })
        await repo.upsertPriceSnapshot({
          symbol: rdnSymbol,
          asset_class: 'cash',
          price: 1,
          currency: 'IDR',
          source: 'bibit',
          timestamp: new Date().toISOString(),
        })
      }
    }

    // 3. Refresh daily portfolio snapshot
    await repo.refreshPortfolioSnapshot(user.id)
    invalidateCache(['/investments'])

    return NextResponse.json({
      success: true,
      message: 'Portofolio Bibit berhasil disinkronkan ke FinTrack',
      data: {
        totalMarketValue: body.data.marketvalue,
        totalInvested: body.data.invested,
        totalProfitLoss: body.data.profitloss,
        tradingBalance: body.data.trading_balance || 0,
        bucketsSynced: body.data.result.length,
      },
    }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Error syncing Bibit portfolio:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyinkronkan data Bibit' },
      { status: 500, headers: corsHeaders }
    )
  }
}
