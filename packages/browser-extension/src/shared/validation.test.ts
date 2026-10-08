import { describe, it, expect } from 'vitest'
import {
  isValidBibitPayload,
  normalizeBibitPayload,
  normalizeRdnBalance,
  isValidRdnPayload,
  MAX_RESULT_ITEMS,
  MAX_AMOUNT,
} from '../shared/validation'

function legacyPayload(overrides: Record<string, unknown> = {}) {
  return {
    message: 'Berhasil',
    data: {
      marketvalue: 1000000,
      invested: 900000,
      profitloss: 100000,
      trading_balance: 50000,
      result: [
        {
          id: 1,
          name: 'Dana Tabungan',
          marketvalue: 500000,
          invested: 480000,
          profitloss: 20000,
          type: { name: 'Reksa Dana' },
        },
      ],
      ...overrides,
    },
  }
}

function v4Payload(overrides: Record<string, unknown> = {}) {
  return {
    message: 'Success retrieve your portfolio',
    data: {
      marketvalue: 559327.83,
      invested: 551477.03,
      profitloss: 7850.8,
      trading_balance: 0,
      results: [
        {
          name: 'Pasar Uang',
          robocategory: 'moneymarket',
          items: [
            {
              invested: 551477.03,
              marketvalue: 559327.83,
              profitloss: 7850.8,
              product: {
                product_id: 832,
                symbol: 'RD832',
                name: 'Majoris Pasar Uang Syariah Indonesia',
                group: 'MUTUAL_FUND',
              },
            },
          ],
        },
      ],
      ...overrides,
    },
  }
}

describe('normalizeBibitPayload', () => {
  it('normalizes the legacy flat schema', () => {
    const result = normalizeBibitPayload(legacyPayload())
    expect(result).not.toBeNull()
    expect(result!.data.marketvalue).toBe(1000000)
    expect(result!.data.result).toHaveLength(1)
    expect(result!.data.result[0]).toMatchObject({ id: 1, name: 'Dana Tabungan', marketvalue: 500000 })
  })

  it('normalizes the v4 nested schema', () => {
    const result = normalizeBibitPayload(v4Payload())
    expect(result).not.toBeNull()
    expect(result!.data.marketvalue).toBeCloseTo(559327.83)
    expect(result!.data.result).toHaveLength(1)
    expect(result!.data.result[0]).toMatchObject({
      id: 832,
      symbol: 'RD832',
      name: 'Majoris Pasar Uang Syariah Indonesia',
      group: 'MUTUAL_FUND',
      marketvalue: 559327.83,
    })
  })

  it('flattens multiple categories and items', () => {
    const payload = v4Payload({
      results: [
        {
          name: 'Pasar Uang',
          items: [
            { invested: 100, marketvalue: 110, profitloss: 10, product: { product_id: 1, symbol: 'RD1', name: 'Fund A' } },
            { invested: 200, marketvalue: 220, profitloss: 20, product: { product_id: 2, symbol: 'RD2', name: 'Fund B' } },
          ],
        },
        {
          name: 'Saham',
          items: [
            { invested: 300, marketvalue: 330, profitloss: 30, product: { product_id: 3, symbol: 'STK1', name: 'Stock A', group: 'STOCK' } },
          ],
        },
      ],
    })
    const result = normalizeBibitPayload(payload)
    expect(result!.data.result).toHaveLength(3)
    expect(result!.data.result.map((h) => h.symbol)).toEqual(['RD1', 'RD2', 'STK1'])
  })

  it('falls back to symbol id when product_id missing', () => {
    const payload = v4Payload({
      results: [
        {
          name: 'Pasar Uang',
          items: [
            {
              invested: 100,
              marketvalue: 110,
              profitloss: 10,
              product: { symbol: 'RD99', name: 'X' },
            },
          ],
        },
      ],
    })
    const result = normalizeBibitPayload(payload)
    expect(result!.data.result[0].id).toBe('RD99')
  })

  it('rejects null / non-objects', () => {
    expect(normalizeBibitPayload(null)).toBeNull()
    expect(normalizeBibitPayload(undefined)).toBeNull()
    expect(normalizeBibitPayload('str')).toBeNull()
    expect(normalizeBibitPayload(42)).toBeNull()
  })

  it('rejects missing data', () => {
    expect(normalizeBibitPayload({})).toBeNull()
    expect(normalizeBibitPayload({ data: null })).toBeNull()
    expect(normalizeBibitPayload({ data: {} })).toBeNull()
  })

  it('rejects non-finite top-level amounts', () => {
    expect(normalizeBibitPayload(v4Payload({ marketvalue: NaN }))).toBeNull()
    expect(normalizeBibitPayload(v4Payload({ invested: Infinity }))).toBeNull()
    expect(normalizeBibitPayload(v4Payload({ profitloss: '100' }))).toBeNull()
  })

  it('rejects amounts beyond MAX_AMOUNT', () => {
    expect(normalizeBibitPayload(v4Payload({ marketvalue: MAX_AMOUNT + 1 }))).toBeNull()
  })

  it('rejects legacy result longer than MAX_RESULT_ITEMS', () => {
    const item = { id: 1, name: 'x', marketvalue: 1, invested: 1, profitloss: 0 }
    const payload = legacyPayload({ result: Array(MAX_RESULT_ITEMS + 1).fill(item) })
    expect(normalizeBibitPayload(payload)).toBeNull()
  })

  it('rejects malformed legacy result items', () => {
    const payload = legacyPayload({
      result: [{ id: 1, name: 'x', marketvalue: 'y', invested: 1, profitloss: 0 }],
    })
    expect(normalizeBibitPayload(payload)).toBeNull()
  })

  it('rejects legacy result item with non-numeric id', () => {
    const payload = legacyPayload({
      result: [{ id: 'a', name: 'x', marketvalue: 1, invested: 1, profitloss: 0 }],
    })
    expect(normalizeBibitPayload(payload)).toBeNull()
  })

  it('rejects legacy result item with overly long name', () => {
    const payload = legacyPayload({
      result: [{ id: 1, name: 'x'.repeat(201), marketvalue: 1, invested: 1, profitloss: 0 }],
    })
    expect(normalizeBibitPayload(payload)).toBeNull()
  })
})

describe('isValidBibitPayload', () => {
  it('accepts legacy and v4 payloads', () => {
    expect(isValidBibitPayload(legacyPayload())).toBe(true)
    expect(isValidBibitPayload(v4Payload())).toBe(true)
  })

  it('rejects unrecognizable payloads', () => {
    expect(isValidBibitPayload({ data: { marketvalue: 1, invested: 1, profitloss: 0 }})).toBe(false)
  })
})

describe('normalizeRdnBalance', () => {
  it('reads trading_balance from the RDN response', () => {
    expect(normalizeRdnBalance({ data: { trading_balance: 98380 }})).toBe(98380)
  })

  it('falls back to cash_on_hand then withdrawal_balance', () => {
    expect(normalizeRdnBalance({ data: { cash_on_hand: 111 }})).toBe(111)
    expect(normalizeRdnBalance({ data: { withdrawal_balance: 222 }})).toBe(222)
  })

  it('prefers trading_balance when multiple present', () => {
    expect(normalizeRdnBalance({ data: { trading_balance: 1, cash_on_hand: 2 }})).toBe(1)
  })

  it('returns null for unrecognizable payloads', () => {
    expect(normalizeRdnBalance(null)).toBeNull()
    expect(normalizeRdnBalance({})).toBeNull()
    expect(normalizeRdnBalance({ data: {} })).toBeNull()
    expect(normalizeRdnBalance({ data: { trading_balance: 'x' }})).toBeNull()
  })

  it('isValidRdnPayload mirrors normalizeRdnBalance', () => {
    expect(isValidRdnPayload({ data: { trading_balance: 5 }})).toBe(true)
    expect(isValidRdnPayload({ data: {} })).toBe(false)
  })
})
