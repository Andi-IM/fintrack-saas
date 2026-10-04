import { getInvestmentRepository } from '@/lib/repositories/investments'
import { ActionResponse } from '@/lib/actions/types'

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)
    const holdingId = searchParams.get('holdingId')
    const repo = getInvestmentRepository()

    if (holdingId) {
      const transactions = await repo.findTransactionsByHolding(holdingId)
      const response: ActionResponse<typeof transactions> = {
        success: true,
        data: transactions,
      }
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // If no holdingId, return empty - the frontend filters by holdingId


    const response: ActionResponse<any[]> = {
      success: true,
      data: [],
    }
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Fetch transactions API error:', error)
    const response: ActionResponse<null> = {
      success: false,
      error: error.message || 'Failed to fetch transactions',
    }
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json()
    const repo = getInvestmentRepository()

    const transaction = await repo.createTransaction({
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

    // Recalculate holding avg price after buy/transfer_in
    if (body.type === 'buy' || body.type === 'transfer_in') {
      await repo.recalculateHoldingAvgPrice(body.holdingId)
    }

    const response: ActionResponse<{ transactionId: string }> = {
      success: true,
      data: { transactionId: transaction.id },
    }
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Create transaction API error:', error)
    const response: ActionResponse<null> = {
      success: false,
      error: error.message || 'Failed to create transaction',
    }
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}