import { getInvestmentRepository } from '@/lib/repositories/investments'
import { ActionResponse } from '@/lib/actions/types'
import type { HoldingWithValue } from '@/lib/repositories/types'

export async function GET(): Promise<Response> {
  try {
    const repo = getInvestmentRepository()
    const overview = await repo.getInvestmentOverview()

    const data: HoldingWithValue[] = overview.topHoldings

    const response: ActionResponse<HoldingWithValue[]> = {
      success: true,
      data,
    }
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Fetch all holdings API error:', error)
    const response: ActionResponse<null> = {
      success: false,
      error: error.message || 'Failed to fetch holdings',
    }
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}