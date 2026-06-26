/// <reference types="node" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiReceiptParser } from '@/lib/ocr/gemini-parser'
import { ReceiptParser } from '@/lib/ocr/receipt-parser'

// Mock environment variable
const originalEnv = process.env.GEMINI_API_KEY

const mockGenerateContent = vi.fn()

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent
      }
    },
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      ARRAY: 'ARRAY',
    }
  }
})

describe('GeminiReceiptParser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalEnv
  })

  it('should throw error if GEMINI_API_KEY is not defined', async () => {
    delete process.env.GEMINI_API_KEY
    const parser = new GeminiReceiptParser()
    await expect(parser.parse('some raw text')).rejects.toThrow('GEMINI_API_KEY is not defined in environment variables')
  })

  it('should parse shopping receipt successfully', async () => {
    const mockResponse = {
      merchant: 'Aciak Mart',
      date: '2026-06-25',
      total: 75000,
      paymentMethod: 'Cash',
      type: 'shopping',
      address: 'Jl. Kampus Unand, Limau Manis',
      items: [
        { name: 'Roti O', amount: 15000, quantity: 1, price: 15000 },
        { name: 'Kopi Susu', amount: 60000, quantity: 2, price: 30000 }
      ]
    }
    
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResponse)
    })

    const parser = new GeminiReceiptParser()
    const result = await parser.parse('raw ocr text for aciak mart')

    expect(mockGenerateContent).toHaveBeenCalledTimes(1)
    expect(result).toEqual(mockResponse)
  })

  it('should parse ATM receipt successfully and generate items fallback', async () => {
    const mockResponse = {
      merchant: 'BCA ATM',
      date: '2026-06-26',
      total: 500000,
      type: 'atm',
      atmId: 'ATM12345',
      transactionType: 'withdrawal',
      fee: 2500,
      referenceNumber: 'REF987654321',
      items: [] // Empty items to test fallback
    }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResponse)
    })

    const parser = new GeminiReceiptParser()
    const result = await parser.parse('raw ocr text for bca withdrawal')

    expect(result.merchant).toBe('BCA ATM')
    expect(result.type).toBe('atm')
    expect(result.items).toHaveLength(1)
    expect(result.items?.[0]).toEqual({
      name: 'Withdrawal - BCA ATM',
      amount: 500000,
      quantity: 1,
      price: 500000
    })
  })

  it('should throw error when generateContent returns empty text', async () => {
    mockGenerateContent.mockResolvedValue({
      text: null
    })

    const parser = new GeminiReceiptParser()
    await expect(parser.parse('some text')).rejects.toThrow('Gemini failed to extract data from the receipt.')
  })

  it('should throw error when generateContent returns invalid JSON', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'invalid json content'
    })

    const parser = new GeminiReceiptParser()
    await expect(parser.parse('some text')).rejects.toThrow('Failed to parse Gemini JSON response.')
  })
})

describe('ReceiptParser delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalEnv
  })

  it('should delegate parsing to GeminiReceiptParser by default', async () => {
    const mockResponse = {
      merchant: 'Citra Swalayan',
      date: '2026-06-25',
      total: 100000,
      type: 'shopping',
      items: [{ name: 'Item 1', amount: 100000 }]
    }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResponse)
    })

    const receiptParser = new ReceiptParser()
    const result = await receiptParser.parse('citra swalayan text')

    expect(result).toEqual(mockResponse)
  })
})
