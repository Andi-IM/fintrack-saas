import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reparseBankStatementWithAI, scanDocumentWithAI } from '@/features/receipts/actions/ocr'
import { documentProcessor } from '@/lib/ocr/processor'

const mockReparse = vi.hoisted(() => vi.fn())

vi.mock('@/lib/ocr/processor', () => ({
  documentProcessor: {
    process: vi.fn(),
  },
}))

vi.mock('@/lib/ocr/openai-parser', () => ({
  OpenAIBankStatementParser: class {
    reparse = mockReparse
  },
}))

describe('ocr server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when no file is provided', async () => {
    const formData = new FormData()
    const result = await scanDocumentWithAI(formData)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('No valid file provided')
  })

  it('returns error when file is a string instead of File/Blob', async () => {
    const formData = new FormData()
    formData.append('file', 'not-a-file')
    const result = await scanDocumentWithAI(formData)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('No valid file provided')
  })

  it('returns field errors when validation fails', async () => {
    const formData = new FormData()
    const file = new Blob(['dummy content'], { type: 'text/plain' })
    formData.append('file', file)
    formData.append('context', 'InvalidContext')

    const result = await scanDocumentWithAI(formData)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('Invalid input')
    expect((result as any).fieldErrors).toBeDefined()
    expect((result as any).fieldErrors?.context).toBeDefined()
  })

  it('returns success when processing returns valid result', async () => {
    const formData = new FormData()
    const file = new Blob(['dummy content'], { type: 'text/plain' })
    formData.append('file', file)
    formData.append('context', 'Receipt')
    formData.append('timezoneOffset', '420')

    const mockResult = { id: 'ocr-1', text: 'Scanned receipt details' }
    vi.mocked(documentProcessor.process).mockResolvedValue(mockResult as any)

    const result = await scanDocumentWithAI(formData)

    expect(result.success).toBe(true)
    expect((result as any).data).toEqual(mockResult)
    expect(documentProcessor.process).toHaveBeenCalledWith(expect.any(Blob), 'Receipt', '420')
  })

  it('returns empty result error when process returns null/undefined', async () => {
    const formData = new FormData()
    const file = new Blob(['dummy content'], { type: 'text/plain' })
    formData.append('file', file)
    formData.append('context', 'BankStatement')

    vi.mocked(documentProcessor.process).mockResolvedValue(null as any)

    const result = await scanDocumentWithAI(formData)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('AI returned an empty result.')
  })

  it('returns error message when processor throws an error', async () => {
    const formData = new FormData()
    const file = new Blob(['dummy content'], { type: 'text/plain' })
    formData.append('file', file)
    formData.append('context', 'Receipt')

    vi.mocked(documentProcessor.process).mockRejectedValue(new Error('OCR engine offline'))

    const result = await scanDocumentWithAI(formData)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('OCR engine offline')
  })

  it('rejects re-scan input when currentResult does not match the OCR result shape', async () => {
    const result = await reparseBankStatementWithAI({
      rawText: 'valid raw OCR text',
      currentResult: {
        bank: 'Bank Jago',
        unsupportedField: 'not part of OCRResult',
      },
    })

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('Invalid re-scan input')
    expect(mockReparse).not.toHaveBeenCalled()
  })

  it('rejects oversized combined raw OCR text and currentResult before invoking the parser', async () => {
    const result = await reparseBankStatementWithAI({
      rawText: 'x'.repeat(200_000),
      currentResult: {
        rawText: 'y'.repeat(39_950),
        bank: 'Bank Jago',
        statementPeriod: '01/08/2021',
        items: [],
      },
    })

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('Re-scan input is too large. Reduce the current parsed result before trying again.')
    expect(mockReparse).not.toHaveBeenCalled()
  })

  it('re-parses valid bank statement input with the validated OCR result shape', async () => {
    mockReparse.mockResolvedValue({
      bank: 'Bank Jago',
      statementPeriod: '01/08/2021',
      items: [],
    })

    const result = await reparseBankStatementWithAI({
      rawText: 'valid raw OCR text',
      currentResult: {
        rawText: 'valid raw OCR text',
        bank: 'Bank Jago',
        statementPeriod: '01/08/2021',
        openingBalance: 100000,
        closingBalance: 150000,
        items: [{
          date: '2021-08-02T00:00:00+07:00',
          name: 'Transfer',
          amount: 50000,
          type: 'income',
          category: 'Transfer',
          bank: 'Bank Jago',
        }],
      },
      timezoneOffset: '+07:00',
      filename: 'statement.pdf',
    })

    expect(result.success).toBe(true)
    expect(mockReparse).toHaveBeenCalledWith(
      'valid raw OCR text',
      expect.objectContaining({ bank: 'Bank Jago' }),
      '+07:00',
      'statement.pdf'
    )
    expect((result as any).data.rawText).toBe('valid raw OCR text')
  })
})
