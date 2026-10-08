// Bibit API evolves over time. This module normalizes the raw payloads
// captured from app.bibit.id into a single stable shape used by the
// extension content script and the FinTrack sync endpoint.
//
// Legacy (v3) shape:
//   data: { marketvalue, invested, profitloss, trading_balance?, result: [{ id, name, ... }] }
//
// Current (v4) shape — /portfolios/category/<id>:
//   data: { marketvalue, invested, profitloss, results: [{ name, items: [{ product: { symbol, name, group }] }] }
// Trading balance moved to a separate endpoint — /rdn?v=3:
//   data: { trading_balance, cash_on_hand, ... }

export interface BibitHolding {
  id: number | string
  name: string
  symbol?: string
  group?: string
  marketvalue: number
  invested: number
  profitloss: number
}

export interface BibitPayload {
  message?: string
  data: {
    marketvalue: number
    invested: number
    profitloss: number
    trading_balance?: number
    result: BibitHolding[]
  }
}

export interface RdnPayload {
  message?: string
  data: {
    trading_balance?: number
    cash_on_hand?: number
    withdrawal_balance?: number
  }
}

export const MAX_RESULT_ITEMS = 200
export const MAX_AMOUNT = 1e15

export function isFiniteAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_AMOUNT
}

function isFiniteAmountOrZero(value: unknown): value is number {
  return value === undefined || isFiniteAmount(value)
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

function normalizeV4Results(results: RawV4Category[]): BibitHolding[] {
  const holdings: BibitHolding[] = []
  for (const category of results) {
    const categoryName = asString(category?.name) || 'Portofolio'
    const items = Array.isArray(category?.items) ? (category.items as RawV4Item[]) : []
    for (const item of items) {
      const product = item?.product || {}
      const marketvalue = item?.marketvalue
      const invested = item?.invested
      const profitloss = item?.profitloss
      if (!isFiniteAmount(marketvalue) || !isFiniteAmountOrZero(invested) || !isFiniteAmountOrZero(profitloss)) {
        continue
      }
      const symbol = asString(product.symbol, 40)
      const productId = product.product_id
      const id =
        typeof productId === 'number' && Number.isFinite(productId)
          ? productId
          : symbol || `${categoryName}-${holdings.length}`
      const name = asString(product.name) || symbol || categoryName
      holdings.push({
        id,
        name,
        symbol: symbol || undefined,
        group: asString(product.group, 40) || undefined,
        marketvalue,
        invested: invested ?? 0,
        profitloss: profitloss ?? 0,
      })
    }
  }
  return holdings
}

/**
 * Normalizes either the legacy v3 or current v4 portfolio payload into the
 * stable internal BibitPayload shape. Returns null when the payload is not a
 * recognizable Bibit portfolio response.
 */
export function normalizeBibitPayload(raw: unknown): BibitPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const data = (raw as { data?: unknown }).data
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const message = asString((raw as { message?: unknown }).message)

  // Legacy v3: data.result already in flat shape
  if (Array.isArray(record.result)) {
    const normalized = normalizeLegacyResult(record.result as RawV4Item[])
    if (normalized === null) return null
    if (!isFiniteAmount(record.marketvalue) || !isFiniteAmount(record.invested) || !isFiniteAmount(record.profitloss)) {
      return null
    }
    const payload: BibitPayload = {
      message: message ?? undefined,
      data: {
        marketvalue: record.marketvalue,
        invested: record.invested,
        profitloss: record.profitloss,
        result: normalized,
      },
    }
    if (isFiniteAmount(record.trading_balance)) {
      payload.data.trading_balance = record.trading_balance
    }
    return payload
  }

  // Current v4: data.results[].items[]
  if (Array.isArray(record.results)) {
    if (!isFiniteAmount(record.marketvalue) || !isFiniteAmount(record.invested) || !isFiniteAmount(record.profitloss)) {
      return null
    }
    const holdings = normalizeV4Results(record.results as RawV4Category[])
    if (holdings.length > MAX_RESULT_ITEMS) return null
    const payload: BibitPayload = {
      message: message ?? undefined,
      data: {
        marketvalue: record.marketvalue,
        invested: record.invested,
        profitloss: record.profitloss,
        result: holdings,
      },
    }
    if (isFiniteAmount(record.trading_balance)) {
      payload.data.trading_balance = record.trading_balance
    }
    return payload
  }

  return null
}

function normalizeLegacyResult(result: RawV4Item[]): BibitHolding[] | null {
  if (result.length > MAX_RESULT_ITEMS) return null
  const holdings: BibitHolding[] = []
  for (const item of result) {
    if (!item || typeof item !== 'object') return null
    const anyItem = item as Record<string, unknown>
    if (!isFiniteAmount(anyItem.marketvalue)) return null
    if (!isFiniteAmount(anyItem.invested)) return null
    if (!isFiniteAmount(anyItem.profitloss)) return null
    const name = asString(anyItem.name)
    if (!name) return null
    const id = anyItem.id
    if (typeof id !== 'number' || !Number.isFinite(id)) return null
    const product = (item as { product?: { symbol?: unknown; group?: unknown } }).product
    holdings.push({
      id,
      name,
      symbol: product ? asString(product.symbol, 40) || undefined : undefined,
      group: product ? asString(product.group, 40) || undefined : undefined,
      marketvalue: anyItem.marketvalue,
      invested: anyItem.invested,
      profitloss: anyItem.profitloss,
    })
  }
  return holdings
}

/** True when the raw payload is a recognizable portfolio response. */
export function isValidBibitPayload(payload: unknown): payload is BibitPayload {
  return normalizeBibitPayload(payload) !== null
}

/**
 * Extracts the RDN (cash) trading balance from the /rdn?v=3 response.
 * Also accepts the legacy shape where trading_balance lived on the
 * portfolio payload.
 */
export function normalizeRdnBalance(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null
  const data = (raw as { data?: unknown }).data
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  for (const key of ['trading_balance', 'cash_on_hand', 'withdrawal_balance']) {
    const value = record[key]
    if (isFiniteAmount(value)) return value
  }
  return null
}

export function isValidRdnPayload(payload: unknown): payload is RdnPayload {
  return normalizeRdnBalance(payload) !== null
}
