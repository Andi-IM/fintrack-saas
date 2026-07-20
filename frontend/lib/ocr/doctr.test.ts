import { afterEach, describe, expect, it, vi } from 'vitest'
import { DoctrOcrExtractor } from './doctr'

describe('DoctrOcrExtractor', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ])('can handle %s documents', (mimeType) => {
    const extractor = new DoctrOcrExtractor()

    expect(extractor.canHandle(mimeType, { filename: 'document' })).toBe(true)
  })

  it('does not handle unsupported document types', () => {
    const extractor = new DoctrOcrExtractor()

    expect(extractor.canHandle('text/plain', { filename: 'notes.txt' })).toBe(false)
  })

  it('requires the Modal service URL before extraction', async () => {
    const extractor = new DoctrOcrExtractor()

    vi.stubEnv('OCR_SERVICE_URL', '')
    vi.stubEnv('OCR_API_KEY', 'test-key')

    await expect(extractor.extractText('ZmFrZQ==')).rejects.toThrow('OCR_SERVICE_URL is not configured')
  })

  it('requires the Modal API key before extraction', async () => {
    const extractor = new DoctrOcrExtractor()

    vi.stubEnv('OCR_SERVICE_URL', 'https://example.test/ocr')
    vi.stubEnv('OCR_API_KEY', '')

    await expect(extractor.extractText('ZmFrZQ==')).rejects.toThrow('OCR_API_KEY is not configured')
  })
})
