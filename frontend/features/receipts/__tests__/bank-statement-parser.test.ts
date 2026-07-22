import { describe, expect, it, vi } from 'vitest'
import { BankStatementParser } from '@/lib/ocr/bank-statement-parser'
import type { IBankParser } from '@/lib/ocr/interfaces'

describe('BankStatementParser', () => {
  it('reports parser failure details instead of masking them as unsupported format', async () => {
    const parser = new BankStatementParser([
      {
        bankName: 'BNI',
        identify: vi.fn(() => true),
        parse: vi.fn(() => ({ bank: 'BNI', items: [] })),
      },
      {
        bankName: 'OpenAI AI Parser',
        identify: vi.fn(() => true),
        parse: vi.fn(() => {
          throw new Error('GROQ_API_KEY is not defined in environment variables')
        }),
      },
    ] satisfies IBankParser[])

    await expect(parser.parse('BNI Taplus Muda')).rejects.toThrow(
      'Gagal memproses bank statement. Detail parser: BNI returned 0 items; OpenAI AI Parser: GROQ_API_KEY is not defined in environment variables'
    )
  })

  it('keeps unsupported format error when no parser identifies the statement', async () => {
    const parser = new BankStatementParser([
      {
        bankName: 'BNI',
        identify: vi.fn(() => false),
        parse: vi.fn(),
      },
    ] satisfies IBankParser[])

    await expect(parser.parse('unknown statement text')).rejects.toThrow(
      'Format bank statement tidak didukung. Bank yang didukung saat ini: BNI'
    )
  })
})
