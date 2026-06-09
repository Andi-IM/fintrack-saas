'use server'

interface OCRResult {
  merchant?: string
  items?: any[]
  total?: number
  category?: string
  statementPeriod?: string
  totalItems?: number
}

async function extractTextWithVisionAPI(base64Data: string): Promise<string> {
  // Use GOOGLE_CLOUD_API_KEY from environment variables
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY
  if (!apiKey) {
    throw new Error('Google Cloud API Key is not configured. Please add GOOGLE_CLOUD_API_KEY to your .env file.')
  }

  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          image: {
            content: base64Data,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Google Cloud Vision API Error:', errorText)
    throw new Error(`Google Cloud Vision API returned status ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  console.log('Vision API Response:', JSON.stringify(result, null, 2))
  const rawText = result.responses?.[0]?.fullTextAnnotation?.text
  if (!rawText) {
    throw new Error('No text detected in the document by Google Cloud Vision API.')
  }

  return rawText
}

// Enforce purely local parsing instead of using Gemini
function parseReceiptText(text: string): any {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  // 1. Merchant: assume it's the first line
  const merchant = lines[0] || 'Unknown Merchant'

  // 2. Extract total amount
  let total = 0
  const totalKeywords = [/total/i, /jumlah/i, /grand\s*total/i, /bayar/i, /nett/i, /amount/i]
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (totalKeywords.some(regex => regex.test(line))) {
      const numberMatches = line.match(/\d+([.,]\d+)?/g)
      if (numberMatches && numberMatches.length > 0) {
        const cleanNumber = numberMatches[numberMatches.length - 1].replace(/[.,]/g, '')
        const val = parseInt(cleanNumber, 10)
        if (!isNaN(val) && val > total) {
          total = val
        }
      }
    }
  }

  // Fallback to find largest number in the document
  if (total === 0) {
    const allNumbers = text.match(/\b\d{4,7}\b/g)
    if (allNumbers) {
      const parsedNumbers = allNumbers.map(n => parseInt(n, 10))
      total = Math.max(...parsedNumbers, 0)
    }
  }

  // 3. Category matching based on keywords
  let category = 'Other'
  const textLower = text.toLowerCase()
  if (/makan|minum|food|beverage|resto|cafe|coffee|kopi|nasi|mie|teh/i.test(textLower)) {
    category = 'Food'
  } else if (/trans|ojek|grab|gojek|taxi|taksi|bensin|fuel|pertamina/i.test(textLower)) {
    category = 'Transport'
  } else if (/pln|listrik|pdam|air|telkom|wifi|internet|pulsa/i.test(textLower)) {
    category = 'Utilities'
  } else if (/bioskop|cinema|tiket|fun|game|nonton/i.test(textLower)) {
    category = 'Entertainment'
  } else if (/baju|celana|shop|mall|store|tokopedia|shopee/i.test(textLower)) {
    category = 'Shopping'
  }

  // 4. Create items array
  const items = [{
    name: merchant,
    amount: total
  }]

  return {
    merchant,
    items,
    total,
    category
  }
}

function parseBankStatementText(text: string): any {
  let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  // 1. Period extraction
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
                  'jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des']
  let statementPeriod = 'Unknown Period'
  for (const line of lines) {
    const lineLower = line.toLowerCase()
    for (const m of months) {
      if (lineLower.includes(m)) {
        const yearMatch = line.match(/\b(202\d)\b/)
        if (yearMatch) {
          statementPeriod = `${m.toUpperCase()} ${yearMatch[0]}`
          break
        }
      }
    }
    if (statementPeriod !== 'Unknown Period') break
  }

  // Truncate lines at the first footer/summary keyword to avoid including summary numbers
  const stopKeywords = ['saldo awal', 'mutasi debit', 'mutasi kredit', 'saldo akhir']
  let truncateIndex = lines.length
  for (let i = 0; i < lines.length; i++) {
    if (stopKeywords.some(keyword => lines[i].toLowerCase().includes(keyword))) {
      truncateIndex = i
      break
    }
  }
  lines = lines.slice(0, truncateIndex)

  // 2. Identify transaction rows/blocks
  // A transaction line starts with a date pattern:
  // e.g. "03 Des 2025" or "26 Des 2025" or "03/12/2025" or "03-12"
  const dateRegex = /^\b(\d{1,2})[\s\-.\/]([a-zA-Z]{3,9}|\d{1,2})([\s\-.\/]\d{2,4})?\b/
  const blockStartIndices: number[] = []
  
  for (let i = 0; i < lines.length; i++) {
    if (dateRegex.test(lines[i])) {
      blockStartIndices.push(i)
    }
  }

  const items: any[] = []
  
  for (let k = 0; k < blockStartIndices.length; k++) {
    const startIndex = blockStartIndices[k]
    const endIndex = k + 1 < blockStartIndices.length ? blockStartIndices[k + 1] : lines.length
    
    const blockLines = lines.slice(startIndex, endIndex)
    if (blockLines.length === 0) continue

    const dateStr = blockLines[0]

    const potentialAmounts: number[] = []
    const descLines: string[] = []
    
    const timeRegex = /^\b\d{1,2}:\d{2}(:\d{2})?\b/
    const refRegex = /^[A-Za-z0-9]{8,20}$/ // reference number like FT25337Q1JKX

    for (let i = 1; i < blockLines.length; i++) {
      const line = blockLines[i]
      
      // Skip time line
      if (timeRegex.test(line)) continue
      
      // Check if it's an amount line
      const isAmount = /^\d{1,3}(\.\d{3})*(,\d{2})?$/.test(line) || /^\d+,\d{2}$/.test(line) || /^\d+(\.\d{2})?$/.test(line) || /^\d{4,9}$/.test(line)
      
      if (isAmount) {
        let cleanVal = line
        if (line.includes(',')) {
          // Indonesian style decimal separator: split by comma to get base value
          cleanVal = line.split(',')[0]
        }
        cleanVal = cleanVal.replace(/\./g, '') // remove thousands separator
        const val = parseInt(cleanVal, 10)
        if (!isNaN(val)) {
          potentialAmounts.push(val)
        }
      } else {
        // Description line
        if (!refRegex.test(line) && !line.toLowerCase().includes('reff') && !line.toLowerCase().includes('debit') && !line.toLowerCase().includes('kredit')) {
          descLines.push(line)
        }
      }
    }

    // We only process if we have valid amounts detected
    if (potentialAmounts.length === 0) continue

    // In Indonesian banks like BSI, the values list usually ends with [Debit, Kredit, Saldo] or [Kredit, Debit, Saldo]
    let amount = 0
    let type = 'expense'
    
    if (potentialAmounts.length >= 2) {
      const debit = potentialAmounts[0]
      const kredit = potentialAmounts[1]
      if (kredit > 0 && debit === 0) {
        amount = kredit
        type = 'income'
      } else if (debit > 0 && kredit === 0) {
        amount = debit
        type = 'expense'
      } else {
        amount = debit > 0 ? debit : kredit
        type = debit > 0 ? 'expense' : 'income'
      }
    } else if (potentialAmounts.length === 1) {
      amount = potentialAmounts[0]
      const fullDesc = descLines.join(' ').toLowerCase()
      if (/masuk|setor|kredit|cr|deposit|gaji|salary|transfer\s*masuk/i.test(fullDesc)) {
        type = 'income'
      } else {
        type = 'expense'
      }
    }

    // Format the date (e.g. "03 Des 2025" -> "2025-12-03")
    let formattedDate = new Date().toISOString().split('T')[0]
    const monthMap: Record<string, string> = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'mei': '05', 'jun': '06',
      'jul': '07', 'agu': '08', 'sep': '09', 'okt': '10', 'nov': '11', 'des': '12',
      'januari': '01', 'februari': '02', 'maret': '03', 'april': '04', 'juni': '06',
      'juli': '07', 'agustus': '08', 'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
    }

    const dateParts = dateStr.split(/\s+/)
    if (dateParts.length >= 2) {
      const day = dateParts[0].padStart(2, '0')
      const monthStr = dateParts[1].toLowerCase().replace(/[^a-z]/g, '')
      const month = monthMap[monthStr] || '01'
      const yearMatch = dateStr.match(/\b(202\d)\b/)
      const year = yearMatch ? yearMatch[0] : '2025'
      formattedDate = `${year}-${month}-${day}`
    }

    // Form description
    let name = descLines.join(' ').replace(/\s+/g, ' ').trim()
    if (name.length < 3) name = 'Transaction'

    // Categorization
    let category = 'Other'
    const nameLower = name.toLowerCase()
    if (/gaji|salary|gajian/i.test(nameLower)) {
      category = 'Salary'
    } else if (/makan|food|gofood|grabfood|kopi|coffee|resto/i.test(nameLower)) {
      category = 'Food'
    } else if (/pln|listrik|pdam|telkom/i.test(nameLower)) {
      category = 'Utilities'
    } else if (/bensin|pertamina|gojek|grab|uber|transport/i.test(nameLower)) {
      category = 'Transport'
    } else if (/flip|transfer|trf/i.test(nameLower)) {
      category = 'Transfer'
    }

    // Ignore transactions that have 0 amount (usually header/footer rows)
    if (amount > 0) {
      items.push({
        date: formattedDate,
        name,
        amount,
        type,
        category
      })
    }
  }

  return {
    statementPeriod,
    items,
    totalItems: items.length
  }
}

export async function scanDocumentWithAI(formData: FormData): Promise<OCRResult | null> {
  const file = formData.get('file') as File
  const context = formData.get('context') as 'Receipt' | 'BankStatement'

  if (!file) {
    console.error('OCR Error: No file provided')
    throw new Error('No file provided')
  }

  // Convert File to base64
  const bytes = await file.arrayBuffer()
  const base64Data = Buffer.from(bytes).toString('base64')

  try {
    // Step 1: Extract raw text using Google Cloud Vision API
    const rawText = await extractTextWithVisionAPI(base64Data)
    
    // Step 2: Local parsing without Gemini
    let parsed
    if (context === 'Receipt') {
      parsed = parseReceiptText(rawText)
    } else {
      parsed = parseBankStatementText(rawText)
    }
    
    return parsed
  } catch (error: any) {
    console.error('Error during Google Cloud Vision OCR processing:', error)
    throw new Error(error.message || 'Failed to process document with Google Cloud Vision OCR')
  }
}
