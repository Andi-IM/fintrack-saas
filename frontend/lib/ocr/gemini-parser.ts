import { GoogleGenAI, Type, Schema } from '@google/genai'
import { IBankParser, IReceiptParser } from './interfaces'
import { OCRResult } from './types'

// Initialize the Google Gen AI client
const getAiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables')
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

const receiptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    merchant: { type: Type.STRING, description: 'Store or merchant name' },
    date: { type: Type.STRING, description: 'Date of the receipt in YYYY-MM-DD or DD/MM/YYYY format' },
    total: { type: Type.NUMBER, description: 'Total amount of the receipt' },
    paymentMethod: { type: Type.STRING, description: 'Payment method used e.g. Cash, Debit, Qris' },
    type: { type: Type.STRING, description: 'Must be exactly "shopping" or "atm"' },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Item name' },
          amount: { type: Type.NUMBER, description: 'Total amount for this item' },
          quantity: { type: Type.NUMBER, description: 'Quantity bought' },
          price: { type: Type.NUMBER, description: 'Price per unit' }
        },
        required: ['name', 'amount']
      }
    }
  }
}

const bankStatementSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    bank: { type: Type.STRING, description: 'Name of the bank' },
    statementPeriod: { type: Type.STRING, description: 'Period of the statement' },
    openingBalance: { type: Type.NUMBER },
    closingBalance: { type: Type.NUMBER },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, description: 'Date of transaction' },
          name: { type: Type.STRING, description: 'Transaction description or name' },
          amount: { type: Type.NUMBER, description: 'Transaction amount' },
          type: { type: Type.STRING, description: 'Must be exactly "income" or "expense"' },
          category: { type: Type.STRING, description: 'Category of transaction (e.g., Transfer, Payment, Admin Fee)' },
          bank: { type: Type.STRING, description: 'Bank related to the transaction if applicable' }
        },
        required: ['date', 'name', 'amount', 'type']
      }
    }
  }
}

export class GeminiReceiptParser implements IReceiptParser {
  receiptName = 'Gemini AI Parser'

  identify(text: string): boolean {
    // Always returns true as it acts as a fallback for all unrecognized receipts
    return true
  }

  async parse(text: string, timezoneOffset?: string, filename?: string): Promise<OCRResult> {
    const ai = getAiClient()

    const prompt = `
      Extract structured receipt data from the following raw OCR text.
      If the text appears to be an ATM receipt, classify the 'type' as 'atm'. 
      Otherwise, classify it as 'shopping'.
      
      Raw OCR Text:
      ${text}
    `

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: receiptSchema,
        temperature: 0.1,
      }
    })

    if (!response.text) {
      throw new Error('Gemini failed to extract data from the receipt.')
    }

    try {
      const parsedData = JSON.parse(response.text) as OCRResult
      return parsedData
    } catch (e) {
      throw new Error('Failed to parse Gemini JSON response.')
    }
  }
}

export class GeminiBankStatementParser implements IBankParser {
  bankName = 'Gemini AI Parser'

  identify(text: string): boolean {
    // Always returns true as it acts as a fallback for all unrecognized bank statements
    return true
  }

  async parse(text: string, timezoneOffset?: string, filename?: string): Promise<OCRResult> {
    const ai = getAiClient()

    const prompt = `
      Extract structured bank statement data from the following raw OCR text.
      Identify each transaction correctly as 'income' or 'expense'.
      Extract the dates as accurately as possible.

      Raw OCR Text:
      ${text}
    `

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: bankStatementSchema,
        temperature: 0.1,
      }
    })

    if (!response.text) {
      throw new Error('Gemini failed to extract data from the bank statement.')
    }

    try {
      const parsedData = JSON.parse(response.text) as OCRResult
      
      // Ensure the transactions have the bank field set correctly if available globally
      if (parsedData.items && parsedData.bank) {
        parsedData.items = parsedData.items.map(item => ({
          ...item,
          bank: ('bank' in item && item.bank) ? item.bank : parsedData.bank
        }))
      }

      return parsedData
    } catch (e) {
      throw new Error('Failed to parse Gemini JSON response.')
    }
  }
}
