import { describe, it, expect } from 'vitest'
import { ShoppingReceiptParser } from '@/lib/ocr/receipts/shopping-parser'

describe('ShoppingReceiptParser', () => {
  const parser = new ShoppingReceiptParser()

  describe('parseFormatA quantity handling', () => {
    it('parses "NAME PRICE xQTY" with a unit price before the multiplier', () => {
      const text = ['ACIAK MART', 'LEMONIA 130G 9.000 x1']

      const result = parser.parse(text.join('\n'))

      expect(result.items).toHaveLength(1)
      expect(result.items[0]).toMatchObject({
        name: 'LEMONIA 130G',
        quantity: 1,
        price: 9000,
        amount: 9000,
      })
    })

    it('parses "NAME × QTY unit" with amount on the next line', () => {
      const text = [
        'INDOMARET',
        'DAY BUTTERCOTCH 226R × 5 pcs',
        '8.000',
      ]

      const result = parser.parse(text.join('\n'))

      expect(result.items).toHaveLength(1)
      expect(result.items[0]).toMatchObject({
        name: 'DAY BUTTERCOTCH 226R',
        quantity: 5,
        amount: 8000,
        price: 1600,
      })
    })

    it('parses multiple "NAME × QTY unit" lines with amount on the next line', () => {
      const text = [
        'TOKO MAKMUR',
        'DAY BUTTERCOTCH 226R × 5 pcs',
        '8.000',
        'HARNELI RISOLES KOTAK × 1 pcs',
        '13.000',
      ]

      const result = parser.parse(text.join('\n'))

      expect(result.items).toHaveLength(2)
      expect(result.items[0]).toMatchObject({
        name: 'DAY BUTTERCOTCH 226R',
        quantity: 5,
        amount: 8000,
      })
      expect(result.items[1]).toMatchObject({
        name: 'HARNELI RISOLES KOTAK',
        quantity: 1,
        amount: 13000,
      })
    })

    it('does not mistake the "226R" model code for a quantity', () => {
      const text = ['TOKO', 'DAY BUTTERCOTCH 226R × 5 pcs', '8.000']

      const result = parser.parse(text.join('\n'))

      expect(result.items[0].quantity).toBe(5)
      expect(result.items[0].name).toContain('226R')
    })
  })
})
