import { getInvestmentRepository } from '@/lib/repositories/investments'
import { ActionResponse } from '@/lib/actions/types'
import type { AccountWithHoldings } from '@/lib/repositories/types'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const repo = getInvestmentRepository()

    const result = await repo.findAccountById(id)
    if (!result) {
      const response: ActionResponse<null> = {
        success: false,
        error: 'Account not found',
      }
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const holdings = await repo.findHoldingsByAccount(id)

    // Enrich holdings with latest prices
    const enrichedHoldings = []
    for (const holding of holdings) {
      const latestPrice = await repo.findLatestPrice(holding.symbol, holding.asset_class)
      const currentPrice = latestPrice?.price ?? null
      const marketValue = holding.quantity * (currentPrice ?? holding.avg_buy_price ?? 0)
      const costBasis = holding.quantity * (holding.avg_buy_price ?? 0)
      const gainLoss = marketValue - costBasis
      const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

      enrichedHoldings.push({
        id: holding.id,
        accountId: id,
        accountName: result.name,
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

    const data: AccountWithHoldings = {
      id: result.id,
      name: result.name,
      type: result.type,
      broker: result.broker,
      currency: result.currency,
      totalValue,
      totalCost,
      gainLoss,
      gainLossPct,
      holdingsCount: enrichedHoldings.length,
      holdings: enrichedHoldings,
    }

    const response: ActionResponse<AccountWithHoldings> = {
      success: true,
      data,
    }
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Fetch account with holdings API error:', error)
    const response: ActionResponse<null> = {
      success: false,
      error: error.message || 'Failed to fetch account',
    }
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const body = await request.json()
    const repo = getInvestmentRepository()

    await repo.updateAccount(id, body)

    const response: ActionResponse<void> = { success: true }
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Update account API error:', error)
    const response: ActionResponse<null> = {
      success: false,
      error: error.message || 'Failed to update account',
    }
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const repo = getInvestmentRepository()

    await repo.deleteAccount(id)

    const response: ActionResponse<void> = { success: true }
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Delete account API error:', error)
    const response: ActionResponse<null> = {
      success: false,
      error: error.message || 'Failed to delete account',
    }
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}