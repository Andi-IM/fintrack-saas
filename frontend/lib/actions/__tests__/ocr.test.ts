import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scanDocumentWithAI } from '../ocr'
import { documentProcessor } from '@/lib/ocr/processor'

vi.mock('@/lib/ocr/processor', () => ({
  documentProcessor: {
    process: vi.fn(),
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
    expect(result.error).toBe('No valid file provided')
  })

  it('returns error when file is a string instead of File/Blob', async () => {
    const formData = new FormData()
    formData.append('file', 'not-a-file')
    const result = await scanDocumentWithAI(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('No valid file provided')
  })

  it('returns field errors when validation fails', async () => {
    const formData = new FormData()
    const file = new Blob(['dummy content'], { type: 'text/plain' })
    formData.append('file', file)
    formData.append('context', 'InvalidContext')

    const result = await scanDocumentWithAI(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid input')
    expect(result.fieldErrors).toBeDefined()
    expect(result.fieldErrors?.context).toBeDefined()
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
    expect(result.data).toEqual(mockResult)
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
    expect(result.error).toBe('AI returned an empty result.')
  })

  it('returns error message when processor throws an error', async () => {
    const formData = new FormData()
    const file = new Blob(['dummy content'], { type: 'text/plain' })
    formData.append('file', file)
    formData.append('context', 'Receipt')

    vi.mocked(documentProcessor.process).mockRejectedValue(new Error('OCR engine offline'))

    const result = await scanDocumentWithAI(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('OCR engine offline')
  })
})
