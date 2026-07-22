/// <reference types="node" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenAIBankStatementParser, OpenAIReceiptParser } from '@/lib/ocr/openai-parser'
import { ReceiptParser } from '@/lib/ocr/receipt-parser'

const originalGroqEnv = process.env.GROQ_API_KEY
const originalMistralEnv = process.env.MISTRAL_API_KEY

const mockCreate = vi.fn()
const mockOpenAIConfig = vi.fn()

vi.mock('openai', () => {
  return {
    default: class {
      config: unknown

      constructor(config: unknown) {
        this.config = config
        mockOpenAIConfig(config)
      }

      chat = {
        completions: {
          create: (payload: unknown) => mockCreate(this.config, payload)
        }
      }
    }
  }
})

describe('OpenAIReceiptParser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GROQ_API_KEY = 'test-api-key'
    process.env.MISTRAL_API_KEY = 'test-mistral-key'
  })

  afterEach(() => {
    process.env.GROQ_API_KEY = originalGroqEnv
    process.env.MISTRAL_API_KEY = originalMistralEnv
  })

  it('should throw error if no LLM provider API key is configured', async () => {
    delete process.env.GROQ_API_KEY
    delete process.env.MISTRAL_API_KEY
    const parser = new OpenAIReceiptParser()
    await expect(parser.parse('some raw text')).rejects.toThrow(
      'No LLM provider API key is configured. Set GROQ_API_KEY or MISTRAL_API_KEY.'
    )
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

  it('should fallback to Mistral and keep Groq error logged', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockResponse = {
      merchant: 'Fallback Mart',
      date: '2026-06-27',
      total: 88000,
      type: 'shopping',
      items: [{ name: 'Item Fallback', amount: 88000, quantity: 1, price: 88000 }]
    }

    mockCreate.mockImplementation(async (config: { baseURL?: string }, payload: { model?: string }) => {
      if (config.baseURL === 'https://api.groq.com/openai/v1') {
        expect(payload.model).toBe('llama-3.3-70b-versatile')
        throw new Error('Groq upstream timeout')
      }

      expect(config.baseURL).toBe('https://api.mistral.ai/v1')
      expect(payload.model).toBe('mistral-large-2512')
      return {
        choices: [{
          message: {
            content: JSON.stringify(mockResponse)
          }
        }]
      }
    })

    const parser = new OpenAIReceiptParser()
    const result = await parser.parse('raw ocr text with provider fallback')

    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      ...mockResponse,
      date: '2026-06-27T12:00:00+07:00'
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[OCR] Groq failed during receipt parsing.',
      expect.any(Error)
    )
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[OCR] Calling external LLM provider Groq for receipt parsing.',
      expect.objectContaining({
        attempt: 1,
        totalProviders: 2,
        baseURL: 'https://api.groq.com/openai/v1',
        model: 'llama-3.3-70b-versatile',
      })
    )
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[OCR] Falling back to the next external LLM provider after Groq failed during receipt parsing.'
    )
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[OCR] External LLM provider Mistral Large 3 succeeded for receipt parsing.',
      expect.objectContaining({
        attempt: 2,
        totalProviders: 2,
        baseURL: 'https://api.mistral.ai/v1',
        model: 'mistral-large-2512',
      })
    )

    consoleInfoSpy.mockRestore()
    consoleErrorSpy.mockRestore()
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
    delete process.env.MISTRAL_API_KEY
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: null
        }
      }]
    })

    const parser = new OpenAIReceiptParser()
    await expect(parser.parse('some text')).rejects.toThrow(
      'All LLM providers failed during receipt parsing. Detail: Groq: Groq failed to extract data from the receipt.'
    )
  })

  it('should throw error when create returns invalid JSON', async () => {
    delete process.env.MISTRAL_API_KEY
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: 'invalid json content'
        }
      }]
    })

    const parser = new OpenAIReceiptParser()
    await expect(parser.parse('some text')).rejects.toThrow(
      'All LLM providers failed during receipt parsing. Detail: Groq: Failed to parse OpenAI JSON response.'
    )
  })
})

describe('OpenAIBankStatementParser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GROQ_API_KEY = 'test-api-key'
    process.env.MISTRAL_API_KEY = 'test-mistral-key'
  })

  afterEach(() => {
    process.env.GROQ_API_KEY = originalGroqEnv
    process.env.MISTRAL_API_KEY = originalMistralEnv
  })

  it('normalizes AI statement period labels to first-day date input format', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            bank: 'BCA',
            statementPeriod: 'Agustus 2021',
            openingBalance: 100000,
            closingBalance: 120000,
            items: []
          })
        }
      }]
    })

    const parser = new OpenAIBankStatementParser()
    const result = await parser.parse('raw bank statement text')

    expect(result.statementPeriod).toBe('01/08/2021')
  })

  it('falls back to Mistral when Groq fails for bank statements', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockCreate.mockImplementation(async (config: { baseURL?: string }, payload: { model?: string }) => {
      if (config.baseURL === 'https://api.groq.com/openai/v1') {
        expect(payload.model).toBe('llama-3.3-70b-versatile')
        throw new Error('Groq rate limited')
      }

      expect(config.baseURL).toBe('https://api.mistral.ai/v1')
      expect(payload.model).toBe('mistral-large-2512')
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              bank: 'BCA',
              statementPeriod: 'Agustus 2021',
              openingBalance: 100000,
              closingBalance: 120000,
              items: [{
                date: '02/08/2021 07:15',
                name: 'Transfer masuk',
                amount: 20000,
                type: 'income',
                category: 'Transfer',
              }]
            })
          }
        }]
      }
    })

    const parser = new OpenAIBankStatementParser()
    const result = await parser.parse('raw bank statement text')

    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(result.statementPeriod).toBe('01/08/2021')
    expect(result.items?.[0]).toMatchObject({
      name: 'Transfer masuk',
      bank: 'BCA',
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[OCR] Groq failed during bank statement parsing.',
      expect.any(Error)
    )
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[OCR] Calling external LLM provider Groq for bank statement parsing.',
      expect.objectContaining({
        attempt: 1,
        totalProviders: 2,
        baseURL: 'https://api.groq.com/openai/v1',
        model: 'llama-3.3-70b-versatile',
      })
    )
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[OCR] Falling back to the next external LLM provider after Groq failed during bank statement parsing.'
    )
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[OCR] External LLM provider Mistral Large 3 succeeded for bank statement parsing.',
      expect.objectContaining({
        attempt: 2,
        totalProviders: 2,
        baseURL: 'https://api.mistral.ai/v1',
        model: 'mistral-large-2512',
      })
    )

    consoleInfoSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('re-parses bank statements by comparing raw OCR text with the previous JSON draft', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            bank: 'Bank Jago',
            statementPeriod: 'Agustus 2021',
            openingBalance: 100000,
            closingBalance: 150000,
            items: [{
              date: '02/08/2021',
              name: 'Corrected transfer',
              amount: 50000,
              type: 'income',
              category: 'Transfer',
            }]
          })
        }
      }]
    })

    const parser = new OpenAIBankStatementParser()
    const result = await parser.reparse(
      '02/08/2021 Corrected transfer Kredit 50.000,00',
      {
        rawText: 'this should not be duplicated in current JSON',
        bank: 'Bank Jago',
        statementPeriod: '01/08/2021',
        items: [{ date: '2021-08-02', name: 'Wrong transfer', amount: 5000, type: 'income', category: 'Transfer', bank: 'Bank Jago' }],
      },
      '+07:00',
      'statement.pdf'
    )

    const prompt = mockCreate.mock.calls[0][1].messages[1].content
    expect(prompt).toContain('Current Parsed JSON:')
    expect(prompt).toContain('Wrong transfer')
    expect(prompt).not.toContain('this should not be duplicated')
    expect(prompt).toContain('Raw OCR Text:')
    expect(prompt).toContain('02/08/2021 Corrected transfer Kredit 50.000,00')
    expect(result.statementPeriod).toBe('01/08/2021')
    expect(result.items?.[0]).toMatchObject({
      name: 'Corrected transfer',
      bank: 'Bank Jago',
    })
  })
})

describe('ReceiptParser delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GROQ_API_KEY = 'test-api-key'
    process.env.MISTRAL_API_KEY = 'test-mistral-key'
  })

  afterEach(() => {
    process.env.GROQ_API_KEY = originalGroqEnv
    process.env.MISTRAL_API_KEY = originalMistralEnv
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
