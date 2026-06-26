/// <reference types="node" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenAIReceiptParser } from '@/lib/ocr/openai-parser'
import { ReceiptParser } from '@/lib/ocr/receipt-parser'

// Mock environment variable
const originalEnv = process.env.GROQ_API_KEY

const mockCreate = vi.fn()

vi.mock('openai', () => {
  return {
    default: class {
      chat = {
        completions: {
          create: mockCreate
        }
      }
    }
  }
})

describe('OpenAIReceiptParser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GROQ_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    process.env.GROQ_API_KEY = originalEnv
  })

  it('should throw error if GROQ_API_KEY is not defined', async () => {
    delete process.env.GROQ_API_KEY
    const parser = new OpenAIReceiptParser()
    await expect(parser.parse('some raw text')).rejects.toThrow('GROQ_API_KEY is not defined in environment variables')
  })

  it('should parse shopping receipt successfully', async () => {
    const mockResponse = {
      merchant: 'Aciak Mart',
      date: '2026-06-25',
      total: 75000,
      paymentMethod: 'Cash',
      type: 'shopping',
      address: 'Jl. Kampus Unand, Limau Manis',
      amountPaid: 75000,
      change: 0,
      items: [
        { name: 'Roti O', amount: 15000, quantity: 1, price: 15000 },
        { name: 'Kopi Susu', amount: 60000, quantity: 2, price: 30000 }
      ]
    }
    
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify(mockResponse)
        }
      }]
    })

    const parser = new OpenAIReceiptParser()
    const result = await parser.parse('raw ocr text for aciak mart')

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      ...mockResponse,
      date: '2026-06-25T12:00:00+07:00'
    })
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

    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify(mockResponse)
        }
      }]
    })

    const parser = new OpenAIReceiptParser()
    const result = await parser.parse('raw ocr text for bca withdrawal')

    expect(result.merchant).toBe('BCA ATM')
    expect(result.type).toBe('atm')
    expect(result.date).toBe('2026-06-26T12:00:00+07:00')
    expect(result.items).toHaveLength(1)
    expect(result.items?.[0]).toEqual({
      name: 'Withdrawal - BCA ATM',
      amount: 500000,
      quantity: 1,
      price: 500000
    })
  })

  it('should throw error when create returns empty message content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: null
        }
      }]
    })

    const parser = new OpenAIReceiptParser()
    await expect(parser.parse('some text')).rejects.toThrow('OpenAI failed to extract data from the receipt.')
  })

  it('should throw error when create returns invalid JSON', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: 'invalid json content'
        }
      }]
    })

    const parser = new OpenAIReceiptParser()
    await expect(parser.parse('some text')).rejects.toThrow('Failed to parse OpenAI JSON response.')
  })
})

describe('ReceiptParser delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GROQ_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    process.env.GROQ_API_KEY = originalEnv
  })

  it('should delegate parsing to OpenAIReceiptParser by default', async () => {
    const mockResponse = {
      merchant: 'Citra Swalayan',
      date: '2026-06-25',
      total: 100000,
      type: 'shopping',
      amountPaid: 100000,
      change: 0,
      items: [{ name: 'Item 1', amount: 100000 }]
    }

    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify(mockResponse)
        }
      }]
    })

    const receiptParser = new ReceiptParser()
    const result = await receiptParser.parse('citra swalayan text')

    expect(result).toEqual({
      ...mockResponse,
      date: '2026-06-25T12:00:00+07:00'
    })
  })
})
