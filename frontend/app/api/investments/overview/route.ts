import { getInvestmentRepository } from '@/lib/repositories/investments'
import { ActionResponse } from '@/lib/actions/types'
import type { InvestmentOverview } from '@/lib/repositories/types'

export async function GET(): Promise<Response> {
  try {
    const repo = getInvestmentRepository()
    const overview = await repo.getInvestmentOverview()

    const response: ActionResponse<InvestmentOverview> = {
      success: true,
      data: overview,
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Investment overview API error:', error)
    const response: ActionResponse<null> = {
      success: false,
      error: error.message || 'Failed to fetch investment overview',
    }
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}