export interface BibitResultItem {
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

export interface BibitPayload {
  message?: string
  data: {
    marketvalue: number
    invested: number
    profitloss: number
    trading_balance?: number
    result: BibitResultItem[]
  }
}

export const MAX_RESULT_ITEMS = 200
export const MAX_AMOUNT = 1e15

function isFiniteAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_AMOUNT
}

export function isValidBibitPayload(payload: unknown): payload is BibitPayload {
  if (!payload || typeof payload !== 'object') return false
  const data = (payload as BibitPayload).data
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
