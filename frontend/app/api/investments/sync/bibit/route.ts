import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInvestmentRepository } from '@/lib/repositories/investments'
import { invalidateCache } from '@/lib/cache'
import { buildCorsHeaders, corsPreflightResponse } from '@/lib/cors'

export async function OPTIONS(req: Request) {
  return corsPreflightResponse(req)
}

interface BibitHolding {
  id: number | string
  name: string
  symbol?: string
  group?: string
  marketvalue: number
  invested: number
  profitloss: number
}

interface BibitSyncPayload {
  message?: string
  data: {
    marketvalue: number
    invested: number
    profitloss: number
    trading_balance?: number
    result: BibitHolding[]
  }
}

const MAX_RESULT_ITEMS = 200
const MAX_AMOUNT = 1e15

function isFiniteAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_AMOUNT
}

function asString(value: unknown, maxLen = 200): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > maxLen) return null
  return trimmed
}

interface RawV4Item {
  invested?: unknown
  marketvalue?: unknown
  profitloss?: unknown
  product?: { product_id?: unknown; symbol?: unknown; name?: unknown; group?: unknown }
}

interface RawV4Category {
  name?: unknown
  items?: unknown
}

/**
 * Bibit changed its portfolio API (v4). The portfolio response at
 * `/portfolios/category/<id>` now nests holdings under `data.results[].items[]`
 * and the RDN cash balance moved to a separate `/rdn` endpoint. Normalize the
 * new shape into the flat `data.result[]` structure the rest of this handler
 * already understands, while still accepting the legacy flat shape.
 */
function normalizePayload(body: unknown): BibitSyncPayload | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as { message?: unknown; data?: unknown }
  const data = raw.data
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const message = asString(raw.message) || undefined

  // Already-normalized (extension sends this) or legacy flat shape
  if (Array.isArray(record.result)) {
    if (!isFiniteAmount(record.marketvalue) || !isFiniteAmount(record.invested) || !isFiniteAmount(record.profitloss)) {
      return null
    }
    if (record.result.length > MAX_RESULT_ITEMS) return null
    const holdings: BibitHolding[] = []
    for (const item of record.result as Record<string, unknown>[]) {
      if (!item || typeof item !== 'object') return null
      const name = asString(item.name)
      const id = item.id
      if (!name) return null
      if (typeof id !== 'number' && typeof id !== 'string') return null
      if (!isFiniteAmount(item.marketvalue) || !isFiniteAmount(item.invested) || !isFiniteAmount(item.profitloss)) {
        return null
      }
      holdings.push({
        id: id as number | string,
        name,
        symbol: asString(item.symbol, 40) || undefined,
        group: asString(item.group, 40) || undefined,
        marketvalue: item.marketvalue,
        invested: item.invested,
        profitloss: item.profitloss,
      })
    }
    return {
      message,
      data: {
        marketvalue: record.marketvalue,
        invested: record.invested,
        profitloss: record.profitloss,
        trading_balance: isFiniteAmount(record.trading_balance) ? record.trading_balance : undefined,
        result: holdings,
      },
    }
  }

  // Raw v4: data.results[].items[]
  if (Array.isArray(record.results)) {
    if (!isFiniteAmount(record.marketvalue) || !isFiniteAmount(record.invested) || !isFiniteAmount(record.profitloss)) {
      return null
    }
    const holdings: BibitHolding[] = []
    for (const category of record.results as RawV4Category[]) {
      const categoryName = asString(category?.name) || 'Portofolio'
      const items = Array.isArray(category?.items) ? (category.items as RawV4Item[]) : []
      for (const item of items) {
        const product = item?.product || {}
        if (!isFiniteAmount(item?.marketvalue)) continue
        const symbol = asString(product.symbol, 40)
        const productId = product.product_id
        const id =
          typeof productId === 'number' && Number.isFinite(productId)
            ? productId
            : symbol || `${categoryName}-${holdings.length}`
        holdings.push({
          id,
          name: asString(product.name) || symbol || categoryName,
          symbol: symbol || undefined,
          group: asString(product.group, 40) || undefined,
          marketvalue: item.marketvalue,
          invested: isFiniteAmount(item.invested) ? item.invested : 0,
          profitloss: isFiniteAmount(item.profitloss) ? item.profitloss : 0,
        })
      }
    }
    if (holdings.length > MAX_RESULT_ITEMS) return null
    return {
      message,
      data: {
        marketvalue: record.marketvalue,
        invested: record.invested,
        profitloss: record.profitloss,
        trading_balance: isFiniteAmount(record.trading_balance) ? record.trading_balance : undefined,
        result: holdings,
      },
    }
  }

  return null
}

import { verifyApiKey } from '@/lib/auth/api-keys'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const corsHeaders = buildCorsHeaders(req.headers.get('origin'))
  try {
    const apiKey = req.headers.get('x-api-key')?.trim()
    let userId: string | null = null
    let repo = getInvestmentRepository()

    if (apiKey) {
      const verifyResult = await verifyApiKey(apiKey, 'investments:sync')
      if (!verifyResult.valid || !verifyResult.userId) {
        return NextResponse.json(
          { success: false, error: verifyResult.error || 'Invalid or revoked FinTrack Sync API key.' },
          { status: 401, headers: corsHeaders }
        )
      }
      userId = verifyResult.userId
      repo = getInvestmentRepository({ client: createAdminClient(), userId })
    } else {
      const supabase = await createClient()
      const authHeader = req.headers.get('authorization')
      const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : null
      const refreshToken = req.headers.get('x-refresh-token')?.trim() || null

      let user: any = null

      if (bearerToken) {
        const authResult = await supabase.auth.getUser(bearerToken)
        user = authResult.data?.user || null
      } else {
        const authResult = await supabase.auth.getUser()
        user = authResult.data?.user || null
      }

      // Auto-refresh: If bearer token is expired/invalid, attempt refresh using refreshToken
      if (!user && refreshToken) {
        try {
          const refreshResult = await supabase.auth.refreshSession({ refresh_token: refreshToken })
          user = refreshResult.data?.user || refreshResult.data?.session?.user || null
        } catch {
          // Refresh token failed or expired
        }
      }

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized. Please login to FinTrack or configure your FinTrack Sync Key in the extension.' },
          { status: 401, headers: corsHeaders }
        )
      }
      userId = user.id
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized user' },
        { status: 401, headers: corsHeaders }
      )
    }

    const body = normalizePayload(await req.json())
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid Bibit portfolio payload structure' },
        { status: 400, headers: corsHeaders }
      )
    }

    const existingAccounts = await repo.findAccounts()

    // 1. Process each portfolio holding in result
    for (const item of body.data.result) {
      const accountName = `Bibit - ${item.name}`
      const isStock = item.group?.toLowerCase() === 'stock' || item.name.toLowerCase().includes('saham')
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
      const symbol = item.symbol ? `BIBIT-${item.symbol}` : `BIBIT-${item.id}`
      const holding = existingHoldings.find((h) => h.symbol === symbol)

      const assetClass = isStock ? 'equity' : 'fixed_income'
      const avgBuyPrice = item.invested > 0 ? item.invested : null
      const holdingName = item.group ? `${item.name} (${item.group})` : item.name

      if (!holding) {
        if (item.marketvalue > 0 || item.invested > 0) {
          await repo.createHolding({
            account_id: account.id,
            symbol,
            name: holdingName,
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
          name: holdingName,
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
    await repo.refreshPortfolioSnapshot(userId)
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
