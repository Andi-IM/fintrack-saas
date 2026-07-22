import OpenAI from 'openai'
import { IBankParser, IReceiptParser } from './interfaces'
import { OCRResult } from './types'
import { formatStatementPeriodInputDate } from '@/lib/utils/statement-period'

type LlmProvider = {
  name: string
  apiKey?: string
  baseURL: string
  model: string
}

const getConfiguredProviders = (): LlmProvider[] => [
  {
    name: 'Groq',
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
  },
  {
    name: 'Mistral Large 3',
    apiKey: process.env.MISTRAL_API_KEY,
    baseURL: 'https://api.mistral.ai/v1',
    model: 'mistral-large-2512',
  },
].filter(provider => provider.apiKey)

const getProviderClient = (provider: LlmProvider) => new OpenAI({
  apiKey: provider.apiKey,
  baseURL: provider.baseURL,
})

async function withLlmProviderFallback<T>(
  context: string,
  operation: (provider: LlmProvider, client: OpenAI) => Promise<T>
): Promise<T> {
  const providers = getConfiguredProviders()

  if (providers.length === 0) {
    throw new Error('No LLM provider API key is configured. Set GROQ_API_KEY or MISTRAL_API_KEY.')
  }

  const failures: string[] = []

  for (const [index, provider] of providers.entries()) {
    try {
      console.info(`[OCR] Calling external LLM provider ${provider.name} for ${context}.`, {
        attempt: index + 1,
        totalProviders: providers.length,
        baseURL: provider.baseURL,
        model: provider.model,
      })

      const result = await operation(provider, getProviderClient(provider))

      console.info(`[OCR] External LLM provider ${provider.name} succeeded for ${context}.`, {
        attempt: index + 1,
        totalProviders: providers.length,
        baseURL: provider.baseURL,
        model: provider.model,
      })

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${provider.name}: ${message}`)
      console.error(`[OCR] ${provider.name} failed during ${context}.`, error)

      if (index < providers.length - 1) {
        console.info(`[OCR] Falling back to the next external LLM provider after ${provider.name} failed during ${context}.`)
      }
    }
  }

  throw new Error(`All LLM providers failed during ${context}. Detail: ${failures.join('; ')}`)
}

function formatWithTimezone(dateStr: string, defaultTime = '12:00:00', timezoneOffset = '+07:00'): string {
  try {
    const cleanStr = dateStr.trim()
    
    // Check if it already has offset at the end like +07:00, -05:00, or Z
    if (/[+-]\d{2}:\d{2}$/.test(cleanStr) || cleanStr.endsWith('Z')) {
      return cleanStr
    }

    let datePart = ''
    let timePart = ''

    if (cleanStr.includes('T')) {
      const parts = cleanStr.split('T')
      datePart = parts[0]
      timePart = parts[1]
    } else {
      const parts = cleanStr.split(/\s+/)
      datePart = parts[0]
      timePart = parts[1] || ''
    }

    // Normalize datePart (DD-MM-YYYY or YYYY-MM-DD)
    const dateParts = datePart.split(/[-/]/)
    if (dateParts.length === 3) {
      if (dateParts[2].length === 4) {
        // DD-MM-YYYY -> YYYY-MM-DD
        datePart = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
      } else if (dateParts[0].length === 4) {
        // YYYY-MM-DD -> YYYY-MM-DD
        datePart = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`
      }
    }

    // Normalize timePart (HH:mm:ss or HH:mm)
    let time = timePart ? timePart.trim() : defaultTime
    // Remove any trailing fractional seconds or Z/offset leftover
    time = time.split(/[+-Z]/)[0]
    
    const timeParts = time.split(':')
    if (timeParts.length === 2) {
      time = `${time}:00`
    } else if (timeParts.length === 1 && timeParts[0] === '') {
      time = defaultTime
    }

    return `${datePart}T${time}${timezoneOffset}`
  } catch (err) {
    console.error('Error in formatWithTimezone:', dateStr, err)
    const today = new Date().toISOString().split('T')[0]
    return `${today}T${defaultTime}${timezoneOffset}`
  }
}
 
const receiptSchemaPrompt = `
You must return a JSON object conforming exactly to this structure:
{
  "merchant": string (Store, merchant, or bank name),
  "date": string (ISO 8601 date string e.g. YYYY-MM-DDTHH:mm:ss, combining both the date and the time extracted from the receipt. If time is not available at all, default to 12:00:00, e.g. YYYY-MM-DDT12:00:00),
  "total": number (Total amount of the receipt),
  "paymentMethod": string (Payment method used e.g. Cash, Debit, Qris),
  "type": string (Must be exactly "shopping" or "atm"),
  "address": string (Address of the store or merchant if available),
  "atmId": string (ATM Terminal ID or ATM ID if it is an ATM receipt),
  "transactionType": string (For ATM receipts: must be "withdrawal", "deposit", or "transfer". Null or omit otherwise),
  "fee": number (Admin fee for ATM transactions),
  "referenceNumber": string (Reference number, resi number, or transaction number),
  "amountPaid": number (Cash paid or amount paid by the customer, e.g., "Tunai" or cash amount given. Null or omit if not found),
  "change": number (Change or kembalian returned to the customer. Null or omit if not found),
  "items": Array of objects:
    {
      "name": string (Item name - required),
      "amount": number (Total amount for this item - required),
      "quantity": number (Quantity bought),
      "price": number (Price per unit)
    }
}

CRITICAL FORMATTING INSTRUCTIONS FOR LLM:
1. NUMBERS & AMOUNTS:
   - Raw receipt text often uses "." as a thousands separator and "," for decimals (Indonesian style), or vice-versa.
   - For example: "11.000,00" or "11.000" means 11000 (eleven thousand), NOT 11. "5.500" means 5500, NOT 5.5.
   - You MUST normalize all numeric values (total, price, amount, quantity, fee, amountPaid, change) into standard JSON numbers (e.g., 11000, 5500). Do not use thousands separators in the JSON.
2. DATE & TIME (EXTREMELY IMPORTANT):
   - You MUST extract both date AND time from the raw OCR text if they exist.
   - Date patterns are like "29-03-2026", "29/03/2026", "29-03-26", "29 Mar 2026".
   - Time patterns are like "11:03:32", "11:03", "11.03".
   - You MUST combine the extracted date and time into a single ISO 8601 string: "YYYY-MM-DDTHH:mm:ss" (e.g. "2026-03-29T11:03:32" or "2026-03-29T11:03:00").
   - Do NOT default to "12:00:00" if there is a time mentioned on the receipt (like "11:03:32" or "11:03"). Look carefully at all lines near the date or cashier name.
3. CASH PAID & CHANGE:
   - Extract cash paid (often labeled "Bayar", "Tunai", "Cash Paid") and change returned (often labeled "Kembali", "Kembalian", "Change"). Normalize both into standard JSON numbers (e.g., "50.000" to 50000, "39.000" to 39000).
`

const bankStatementSchemaPrompt = `
You must return a JSON object conforming exactly to this structure:
{
  "bank": string (Name of the bank, e.g., "BSI", "Bank Mandiri". Do not confuse with recipient banks in transactions),
  "statementPeriod": string (Period of the statement. Use the first day of the statement month in DD/MM/YYYY format. Example: for August 2021, return "01/08/2021"),
  "openingBalance": number (Opening balance / Saldo Awal / Saldo Bulan Lalu. Must be a valid amount, never an account number),
  "closingBalance": number (Closing balance / Saldo Akhir. Must be a valid amount),
  "items": Array of objects:
    {
      "date": string (Date and time of transaction if available - required),
      "name": string (Full transaction description. Combine multi-line descriptions if they belong to the same transaction - required),
      "amount": number (Transaction amount. Extracted from Debit or Kredit columns - required),
      "type": string (Must be exactly "income" for Kredit/Dana Masuk, or "expense" for Debit/Dana Keluar - required),
      "category": string (Category of transaction, e.g. Transfer, Payment, Admin Fee),
      "bank": string (Bank related to the transaction if applicable, e.g., destination bank for transfers)
    }
}

CRITICAL FORMATTING INSTRUCTIONS FOR LLM:
1. FLATTENED TABULAR DATA:
   - PDF bank statements often have tabular structures (Date, Description, Ref, Debit, Kredit, Saldo) that get flattened into raw text.
   - You must carefully reconstruct the rows. A transaction usually starts with a Date/Time, followed by a Description (which may span multiple lines), then Reference No, Debit amount, Kredit amount, and Balance amount.
   - Combine description fragments (e.g., "- Bank Jago UUS - ANDI" on one line and "IRHAM MARHAMUDIN" on another) into a single "name".
2. NUMBERS & AMOUNTS VS ACCOUNT NUMBERS:
   - Account numbers are typically long continuous digits (e.g., 7270476079). DO NOT use account numbers as openingBalance or closingBalance.
   - Valid amounts usually have thousands separators and decimals (e.g., "264.996,00").
   - You MUST normalize all numeric values into standard JSON numbers without thousands separators (e.g., "264.996,00" becomes 264996).
3. TRANSACTION TYPE (INCOME/EXPENSE):
   - If an amount appears in the "Debit" column or has text like "Dana Keluar", type MUST be "expense".
   - If an amount appears in the "Kredit" column or has text like "Dana Masuk", type MUST be "income".
   - An amount of "0,00" in Debit/Kredit means the transaction belongs to the other type. Disregard the 0 amount.
4. DATE & TIME:
   - Extract both date and time if available. Convert them to YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss format.
`

export class OpenAIReceiptParser implements IReceiptParser {
  receiptName = 'OpenAI AI Parser'

  identify(text: string): boolean {
    // Always returns true as it acts as a fallback for all unrecognized receipts
    return true
  }

  async parse(text: string, timezoneOffset?: string, filename?: string): Promise<OCRResult> {
    const currentDate = new Date().toISOString().split('T')[0]
    const prompt = `
      Extract structured receipt data from the following raw OCR text.
      Determine if this is a shopping/retail receipt (type: "shopping") or an ATM transaction receipt (type: "atm").
      - For ATM receipts, identify transaction type (withdrawal, deposit, or transfer), ATM/terminal ID, reference number, and admin fee.
      - For shopping receipts, extract the store merchant name, address, payment method, and line items.
      
      Context details:
      - Current Date Reference: ${currentDate}
      - Timezone Offset: ${timezoneOffset || 'Not specified'}
      - Filename: ${filename || 'Not specified'}

      ${receiptSchemaPrompt}

      Raw OCR Text:
      ${text}
    `
    return withLlmProviderFallback('receipt parsing', async (provider, client) => {
      const response = await client.chat.completions.create({
        model: provider.model,
        messages: [
          {
            role: 'system',
            content: 'You are a precise data extraction assistant. You always output valid, clean JSON matching the requested structure. You pay extra attention to extracting both the date and the specific time (e.g. 11:03:32) from the text, and combining them into an ISO 8601 string.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error(`${provider.name} failed to extract data from the receipt.`)
      }

      try {
        const parsedData = JSON.parse(content) as OCRResult

        // Post-processing to normalize date to full local ISO8601 string
        if (parsedData.date) {
          parsedData.date = formatWithTimezone(parsedData.date, '12:00:00', timezoneOffset || '+07:00')
        } else {
          const today = new Date().toISOString().split('T')[0]
          parsedData.date = `${today}T12:00:00${timezoneOffset || '+07:00'}`
        }

        // Post-processing for ATM receipts to guarantee at least one item exists
        if (parsedData.type === 'atm') {
          const merchant = parsedData.merchant || 'ATM'
          const txType = parsedData.transactionType || ''
          const label = txType
            ? `${txType.charAt(0).toUpperCase() + txType.slice(1)} - ${merchant}`
            : merchant
          if (!parsedData.items || parsedData.items.length === 0) {
            parsedData.items = [{
              name: label,
              amount: parsedData.total || 0,
              quantity: 1,
              price: parsedData.total || 0
            }]
          }
        }

        return parsedData
      } catch (error) {
        console.error('Failed to parse OpenAI JSON response. Content:', content, error)
        throw new Error('Failed to parse OpenAI JSON response.')
      }
    })
  }
}

export class OpenAIBankStatementParser implements IBankParser {
  bankName = 'OpenAI AI Parser'

  identify(text: string): boolean {
    // Always returns true as it acts as a fallback for all unrecognized bank statements
    return true
  }

  private normalizeBankStatementResult(parsedData: OCRResult, timezoneOffset?: string): OCRResult {
    if (parsedData.statementPeriod) {
      parsedData.statementPeriod = formatStatementPeriodInputDate(parsedData.statementPeriod) || parsedData.statementPeriod
    }
    
    // Normalize dates in the transaction items
    if (parsedData.items) {
      parsedData.items = parsedData.items.map(item => {
        if ('date' in item && item.date) {
          item.date = formatWithTimezone(item.date, '00:00:00', timezoneOffset || '+07:00')
        }
        if (parsedData.bank) {
          const bankTx = item as any
          bankTx.bank = bankTx.bank || parsedData.bank
        }
        return item
      })
    }

    return parsedData
  }

  private async parsePrompt(prompt: string, timezoneOffset?: string): Promise<OCRResult> {
    return withLlmProviderFallback('bank statement parsing', async (provider, client) => {
      const response = await client.chat.completions.create({
        model: provider.model,
        messages: [
          {
            role: 'system',
            content: 'You are a precise data extraction assistant. You always output valid, clean JSON matching the requested structure.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error(`${provider.name} failed to extract data from the bank statement.`)
      }

      try {
        const parsedData = JSON.parse(content) as OCRResult
        return this.normalizeBankStatementResult(parsedData, timezoneOffset)
      } catch (error) {
        console.error('Failed to parse OpenAI JSON response. Content:', content, error)
        throw new Error('Failed to parse OpenAI JSON response.')
      }
    })
  }

  async parse(text: string, timezoneOffset?: string, filename?: string): Promise<OCRResult> {
    const currentDate = new Date().toISOString().split('T')[0]
    const prompt = `
      Extract structured bank statement data from the following raw OCR text.
      Identify each transaction correctly as 'income' or 'expense'.
      Extract the dates as accurately as possible.

      Context details:
      - Current Date Reference: ${currentDate}
      - Timezone Offset: ${timezoneOffset || 'Not specified'}
      - Filename: ${filename || 'Not specified'}

      ${bankStatementSchemaPrompt}

      Raw OCR Text:
      ${text}
    `

    return this.parsePrompt(prompt, timezoneOffset)
  }

  async reparse(text: string, currentResult: OCRResult, timezoneOffset?: string, filename?: string): Promise<OCRResult> {
    const currentDate = new Date().toISOString().split('T')[0]
    const { rawText: _rawText, ...draftResult } = currentResult
    const prompt = `
      Re-parse this bank statement by comparing the raw OCR text from Modal/docTR with the current parsed JSON.
      The OCR text is the source of truth. Use the current JSON only as a draft to correct.
      Preserve fields that are already correct, fix missing or incorrect transactions, balances, bank name, statement period, transaction dates, amounts, and income/expense types.
      Do not invent transactions that are not supported by the raw OCR text.

      Context details:
      - Current Date Reference: ${currentDate}
      - Timezone Offset: ${timezoneOffset || 'Not specified'}
      - Filename: ${filename || 'Not specified'}

      ${bankStatementSchemaPrompt}

      Current Parsed JSON:
      ${JSON.stringify(draftResult, null, 2)}

      Raw OCR Text:
      ${text}
    `

    return this.parsePrompt(prompt, timezoneOffset)
  }
}
