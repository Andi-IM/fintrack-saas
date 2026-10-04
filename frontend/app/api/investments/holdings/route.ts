import { getInvestmentRepository } from '@/lib/repositories/investments'
import { ActionResponse } from '@/lib/actions/types'
import type { Json } from '@/lib/database.types'

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json()
    const repo = getInvestmentRepository()

    const holding = await repo.createHolding({
      account_id: body.accountId,
      symbol: body.symbol,
      name: body.name,
      asset_class: body.assetClass,
      quantity: body.quantity,
      avg_buy_price: body.avgBuyPrice ?? null,
      currency: body.currency,
      metadata: (body.metadata ?? {}) as Json,
    })

    const response: ActionResponse<{ holdingId: string }> = {
      success: true,
      data: { holdingId: holding.id },
    }
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Create holding API error:', error)
    const response: ActionResponse<null> = {
      success: false,
      error: error.message || 'Failed to create holding',
    }
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}