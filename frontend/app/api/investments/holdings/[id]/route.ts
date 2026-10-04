import { getInvestmentRepository } from '@/lib/repositories/investments'
import { ActionResponse } from '@/lib/actions/types'
import type { Json } from '@/lib/database.types'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const body = await request.json()
    const repo = getInvestmentRepository()

    await repo.updateHolding(id, {
      account_id: body.accountId,
      symbol: body.symbol,
      name: body.name,
      asset_class: body.assetClass,
      quantity: body.quantity,
      avg_buy_price: body.avgBuyPrice ?? null,
      currency: body.currency,
      metadata: (body.metadata ?? {}) as Json,
    })

    const response: ActionResponse<void> = { success: true }
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Update holding API error:', error)
    const response: ActionResponse<null> = {
      success: false,
      error: error.message || 'Failed to update holding',
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

    await repo.deleteHolding(id)

    const response: ActionResponse<void> = { success: true }
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Delete holding API error:', error)
    const response: ActionResponse<null> = {
      success: false,
      error: error.message || 'Failed to delete holding',
    }
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}