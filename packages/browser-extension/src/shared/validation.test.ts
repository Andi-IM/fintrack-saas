import { describe, it, expect } from 'vitest'
import {
  isValidBibitPayload,
  MAX_RESULT_ITEMS,
  MAX_AMOUNT,
} from '../shared/validation'

function validPayload(overrides: Record<string, unknown> = {}) {
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

describe('isValidBibitPayload', () => {
  it('accepts a well-formed payload', () => {
    expect(isValidBibitPayload(validPayload())).toBe(true)
  })

  it('accepts payload without trading_balance', () => {
    const payload = validPayload({ trading_balance: undefined })
    expect(isValidBibitPayload(payload)).toBe(true)
  })

  it('rejects null / non-objects', () => {
    expect(isValidBibitPayload(null)).toBe(false)
    expect(isValidBibitPayload(undefined)).toBe(false)
    expect(isValidBibitPayload('str')).toBe(false)
    expect(isValidBibitPayload(42)).toBe(false)
  })

  it('rejects missing data', () => {
    expect(isValidBibitPayload({})).toBe(false)
    expect(isValidBibitPayload({ data: null })).toBe(false)
  })

  it('rejects non-array result', () => {
    expect(isValidBibitPayload(validPayload({ result: 'nope' }))).toBe(false)
    expect(isValidBibitPayload(validPayload({ result: {} }))).toBe(false)
  })

  it('rejects result longer than MAX_RESULT_ITEMS', () => {
    const item = { id: 1, name: 'x', marketvalue: 1, invested: 1, profitloss: 0 }
    const payload = validPayload({ result: Array(MAX_RESULT_ITEMS + 1).fill(item) })
    expect(isValidBibitPayload(payload)).toBe(false)
  })

  it('accepts result exactly at MAX_RESULT_ITEMS', () => {
    const item = { id: 1, name: 'x', marketvalue: 1, invested: 1, profitloss: 0 }
    const payload = validPayload({ result: Array(MAX_RESULT_ITEMS).fill(item) })
    expect(isValidBibitPayload(payload)).toBe(true)
  })

  it('rejects non-finite top-level amounts', () => {
    expect(isValidBibitPayload(validPayload({ marketvalue: NaN }))).toBe(false)
    expect(isValidBibitPayload(validPayload({ invested: Infinity }))).toBe(false)
    expect(isValidBibitPayload(validPayload({ profitloss: '100' }))).toBe(false)
  })

  it('rejects amounts beyond MAX_AMOUNT', () => {
    expect(isValidBibitPayload(validPayload({ marketvalue: MAX_AMOUNT + 1 }))).toBe(false)
  })

  it('rejects non-finite trading_balance when present', () => {
    expect(isValidBibitPayload(validPayload({ trading_balance: NaN }))).toBe(false)
  })

  it('rejects malformed result items', () => {
    const payload = validPayload({
      result: [{ id: 1, name: 'x', marketvalue: 'y', invested: 1, profitloss: 0 }],
    })
    expect(isValidBibitPayload(payload)).toBe(false)
  })

  it('rejects result item with non-numeric id', () => {
    const payload = validPayload({
      result: [{ id: 'a', name: 'x', marketvalue: 1, invested: 1, profitloss: 0 }],
    })
    expect(isValidBibitPayload(payload)).toBe(false)
  })

  it('rejects result item with overly long name', () => {
    const payload = validPayload({
      result: [
        { id: 1, name: 'x'.repeat(201), marketvalue: 1, invested: 1, profitloss: 0 },
      ],
    })
    expect(isValidBibitPayload(payload)).toBe(false)
  })

  it('rejects negative amounts beyond magnitude limit', () => {
    expect(isValidBibitPayload(validPayload({ marketvalue: -(MAX_AMOUNT + 1) }))).toBe(false)
  })
})
