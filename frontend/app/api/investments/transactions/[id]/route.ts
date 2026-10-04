import { getInvestmentRepository } from '@/lib/repositories/investments'
import { ActionResponse } from '@/lib/actions/types'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const body = await request.json()
    const repo = getInvestmentRepository()

    await repo.updateTransaction(id, {
      holding_id: body.holdingId,
      type: body.type,
      quantity: body.quantity,
      price: body.price,
      fees: body.fees ?? 0,
      taxes: body.taxes ?? 0,
      transaction_date: body.transactionDate,
      settlement_date: body.settlementDate ?? null,
      notes: body.notes ?? null,
      external_id: body.externalId ?? null,
    })

    // Recalculate holding avg price
    await repo.recalculateHoldingAvgPrice(body.holdingId)

    const response: ActionResponse<void> = { success: true }
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Update transaction API error:', error)
    const response: ActionResponse<null> = {
      success: false,
      error: error.message || 'Failed to update transaction',
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
    const { searchParams } = new URL(request.url)
    const holdingId = searchParams.get('holdingId')
    const repo = getInvestmentRepository()

    if (!holdingId) {
      const response: ActionResponse<null> = {
        success: false,
        error: 'holdingId query parameter required',
      }
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await repo.deleteTransaction(id)
    await repo.recalculateHoldingAvgPrice(holdingId)

    const response: ActionResponse<void> = { success: true }
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Delete transaction API error:', error)
    const response: ActionResponse<null> = {
      success: false,
      error: error.message || 'Failed to delete transaction',
    }
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}