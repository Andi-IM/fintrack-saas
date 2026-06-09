'use server'

// @ts-ignore
import { ocrSpace } from 'ocr-space-api-wrapper'
import {
  RECEIPT_TOTAL_KEYWORDS,
  RECEIPT_CATEGORY_PATTERNS,
  STATEMENT_MONTHS,
  STATEMENT_STOP_KEYWORDS,
  STATEMENT_DATE_REGEX,
  STATEMENT_TIME_REGEX,
  STATEMENT_REF_REGEX,
  STATEMENT_MONTH_MAP,
  STATEMENT_CATEGORY_PATTERNS
} from '@/lib/constants/ocr'

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
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (RECEIPT_TOTAL_KEYWORDS.some(regex => regex.test(line))) {
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
  for (const pattern of RECEIPT_CATEGORY_PATTERNS) {
    if (pattern.regex.test(textLower)) {
      category = pattern.category
      break
    }
  }

  // 4. Parse line items
  const items: { name: string, amount: number }[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Check if line contains a quantity marker like "x1", "x2", etc.
    const qtyMatch = line.match(/\bx\s*(\d+)\b/i)
    if (qtyMatch) {
      const qty = parseInt(qtyMatch[1], 10)
      
      // Try to parse using: <name> <price> x<qty>
      const fullMatch = line.match(/^(.*?)\s*(\d{1,3}(?:\.\d{3})+|\d+)\s*x\s*(\d+)/i)
      if (fullMatch) {
        let name = fullMatch[1].trim()
        const priceStr = fullMatch[2].replace(/\./g, '')
        const price = parseInt(priceStr, 10) || 0
        
        // If name is empty, try to get from previous line
        if (!name && i > 0) {
          name = lines[i - 1]
        }
        
        if (name) {
          items.push({
            name,
            amount: price * qty
          })
          continue
        }
      }

      // Fallback: if line is just "x1" or "x 1"
      if (line.toLowerCase().startsWith('x') || line.toLowerCase() === `x${qty}`) {
        // Price should be on the previous line
        if (i > 0) {
          const prevLine = lines[i - 1]
          const price = parseInt(prevLine.replace(/\./g, '').replace(/,/g, ''), 10)
          
          if (!isNaN(price) && i > 1) {
            const name = lines[i - 2]
            items.push({
              name,
              amount: price * qty
            })
            continue
          }
        }
      }
    }
  }

  // Fallback: If no items were parsed, create a default one from merchant name
  if (items.length === 0) {
    items.push({
      name: merchant,
      amount: total
    })
  } else {
    // If we have parsed items, set total to the sum of items to ensure accuracy
    const itemsSum = items.reduce((sum, item) => sum + item.amount, 0)
    if (itemsSum > 0) {
      total = itemsSum
    }
  }

  return {
    merchant,
    items,
    total,
    category
  }
}

function parseBankStatementText(text: string): any {
  const textLower = text.toLowerCase()
  
  // Detect bank format based on bank name keywords or structure
  const isJago = textLower.includes('jago')
  const isSeabank = textLower.includes('seabank')
  const isBsi = textLower.includes('bsi') || textLower.includes('laporan rekening')
  const bankName = isJago ? 'Bank JAGO' : isSeabank ? 'SeaBank' : isBsi ? 'BSI' : 'Bank'

  if (isSeabank) {
    const pages = text.split('---PAGE_BREAK---')
    const items: any[] = []
    let statementPeriod = 'Unknown Period'
    let saldoAwal = 0

    // Parse statement period
    for (const line of text.split('\n')) {
      const lineLower = line.trim().toLowerCase()
      if (lineLower.includes('sampai') || lineLower.includes('s/d') || lineLower.includes(' - ') || lineLower.includes('periode')) {
        for (const m of STATEMENT_MONTHS) {
          if (lineLower.includes(m)) {
            const yearMatch = line.match(/\b(202\d)\b/)
            if (yearMatch) {
              statementPeriod = `${m.toUpperCase()} ${yearMatch[0]}`
              break
            }
          }
        }
      }
      if (statementPeriod !== 'Unknown Period') break
    }

    if (statementPeriod === 'Unknown Period') {
      for (const line of text.split('\n')) {
        const lineLower = line.trim().toLowerCase()
        if (lineLower.includes('halaman') || lineLower.includes('telepon')) continue
        for (const m of STATEMENT_MONTHS) {
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
    }

    // Parse Saldo Awal from text
    const saldoAwalMatch = text.match(/saldo awal\s*(?:\(idr\))?\s*([\d.]+)/i)
    if (saldoAwalMatch) {
      saldoAwal = parseInt(saldoAwalMatch[1].replace(/\./g, ''), 10) || 0
    }

    let lastBalance: number | null = null

    for (const page of pages) {
      const lines = page.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      
      // Locate header line indices
      let dateIdx = -1
      let transIdx = -1
      let keluarIdx = -1
      let masukIdx = -1
      let balanceIdx = -1

      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase()
        if (lower.startsWith('tanggal')) dateIdx = i
        else if (lower.startsWith('transaksi')) transIdx = i
        else if (lower.includes('keluar')) keluarIdx = i
        else if (lower.includes('masuk')) masukIdx = i
        else if (lower.includes('saldo akhir')) balanceIdx = i
      }

      if (dateIdx === -1 || transIdx === -1) {
        continue
      }

      // Slice column sections
      const indices = [
        { label: 'date', idx: dateIdx },
        { label: 'trans', idx: transIdx },
        { label: 'keluar', idx: keluarIdx },
        { label: 'masuk', idx: masukIdx },
        { label: 'balance', idx: balanceIdx }
      ].filter(item => item.idx !== -1).sort((a, b) => a.idx - b.idx)

      const columnLines: Record<string, string[]> = {}
      for (let i = 0; i < indices.length; i++) {
        const start = indices[i].idx + 1
        const end = i + 1 < indices.length ? indices[i + 1].idx : lines.length
        columnLines[indices[i].label] = lines.slice(start, end)
      }

      // 1. Parse dates
      const pageDates: { day: string; month: string; year: string; raw: string }[] = []
      let currentMonthYear = ''

      if (columnLines.date) {
        for (const line of columnLines.date) {
          const lineLower = line.toLowerCase().trim()
          if (
            lineLower.includes('halaman') || 
            lineLower.includes('seabank') || 
            lineLower.includes('sampai') || 
            lineLower.includes('s/d') ||
            lineLower.includes('periode') ||
            lineLower.includes('ringkasan')
          ) continue
          
          const isMonthYear = /^[a-zA-Z]{3,12}\s+\d{4}$/.test(line)
          if (isMonthYear) {
            currentMonthYear = line
            continue
          }

          // Find standard month inside line
          const monthMatch = lineLower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|des|mei|agu|okt)\b/)
          if (monthMatch) {
            const month = monthMatch[1]
            const beforeMonth = lineLower.substring(0, monthMatch.index).trim()
            
            let dayDigits = beforeMonth
              .replace(/[gG]/g, '9')
              .replace(/[sS]/g, '5')
              .replace(/[liI]/g, '1')
              .replace(/[oO]/g, '0')
              .replace(/\D/g, '')
              
            if (dayDigits.length > 0 && dayDigits.length <= 2) {
              const yearMatch = line.match(/\b(202\d)\b/)
              let yearStr = yearMatch ? yearMatch[1] : ''
              
              if (!yearStr && currentMonthYear) {
                const myYearMatch = currentMonthYear.match(/\b(202\d)\b/)
                if (myYearMatch) yearStr = myYearMatch[1]
              }
              
              if (!yearStr) {
                const periodYearMatch = statementPeriod.match(/\b(202\d)\b/)
                yearStr = periodYearMatch ? periodYearMatch[1] : '2026'
              }

              pageDates.push({
                day: dayDigits.padStart(2, '0'),
                month,
                year: yearStr,
                raw: line
              })
            }
          }
        }
      }

      // 2. Parse descriptions with SeaBank ending keywords
      const pageDescs: string[] = []
      if (columnLines.trans) {
        let currentDesc = ''
        const seabankEndKeywords = ['transfer', 'pembayaran', 'pernbayara n', 'pembayara n', 'pernbayaran', 'bunga tabungan', 'biaya', 'cashback', 'qris']
        
        for (const line of columnLines.trans) {
          const lineLower = line.toLowerCase().trim()
          if (lineLower.length === 0) continue
          
          currentDesc = currentDesc ? `${currentDesc} ${line}` : line
          
          const isEnd = seabankEndKeywords.some(kw => lineLower.includes(kw))
          if (isEnd) {
            pageDescs.push(currentDesc)
            currentDesc = ''
          }
        }
        if (currentDesc) {
          pageDescs.push(currentDesc)
        }
      }

      // 3. Parse balances
      const pageBalances: number[] = []
      for (const line of (columnLines.balance || [])) {
        const clean = line.replace(/\./g, '').replace(/,/g, '')
        const val = parseInt(clean, 10)
        if (!isNaN(val) && val > 100) { 
          pageBalances.push(val)
        }
      }

      const minLen = Math.min(pageDates.length, pageDescs.length, pageBalances.length)
      for (let i = 0; i < minLen; i++) {
        const dateObj = pageDates[i]
        const descStr = pageDescs[i]
        const currentBalance = pageBalances[i]
        
        let amount = 0
        let type = 'expense'
        
        if (i > 0) {
          const prevBalance = pageBalances[i - 1]
          const diff = currentBalance - prevBalance
          amount = Math.abs(diff)
          type = diff >= 0 ? 'income' : 'expense'
        } else if (lastBalance !== null) {
          const diff = currentBalance - lastBalance
          amount = Math.abs(diff)
          type = diff >= 0 ? 'income' : 'expense'
        } else {
          // First transaction of first page fallback
          const diff = currentBalance - saldoAwal
          amount = Math.abs(diff)
          type = diff >= 0 ? 'income' : 'expense'
          
          // Match against explicit masuk/keluar columns if difference feels like a mismatch
          const cleanMasuk = (columnLines.masuk || []).map(l => parseInt(l.replace(/\./g, '').replace(/,/g, ''), 10)).filter(v => !isNaN(v))
          const cleanKeluar = (columnLines.keluar || []).map(l => parseInt(l.replace(/\./g, '').replace(/,/g, ''), 10)).filter(v => !isNaN(v))
          
          if (cleanMasuk.includes(currentBalance)) {
            amount = currentBalance
            type = 'income'
          } else if (cleanKeluar.includes(currentBalance)) {
            amount = currentBalance
            type = 'expense'
          }
        }

        // Update lastBalance for subsequent transactions
        lastBalance = currentBalance

        // Format Date
        const monthMap: Record<string, string> = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
          'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12', 'des': '12'
        }
        const monthNum = monthMap[dateObj.month.substring(0, 3)] || '12'
        const formattedDate = `${dateObj.year}-${monthNum}-${dateObj.day}`

        let name = descStr.replace(/\d{9,20}/g, '').replace(/\s+/g, ' ').trim()
        if (name.length < 3) name = 'Transaction'

        // Categorize
        let category = 'Other'
        const nameLower = name.toLowerCase()
        for (const pattern of STATEMENT_CATEGORY_PATTERNS) {
          if (pattern.regex.test(nameLower)) {
            category = pattern.category
            break
          }
        }
        if (/bunga|interest/i.test(nameLower)) category = 'Interest'

        items.push({
          date: formattedDate,
          name,
          amount,
          type,
          category,
          bank: bankName
        })
      }
    }

    return {
      statementPeriod,
      items,
      totalItems: items.length,
      bank: bankName
    }
  }

  if (isJago) {
    const pages = text.split('---PAGE_BREAK---')
    const items: any[] = []
    let statementPeriod = 'Unknown Period'

    // Try to extract period first from the general text
    for (const line of text.split('\n')) {
      const lineLower = line.trim().toLowerCase()
      if (lineLower.includes('sampai') || lineLower.includes('s/d') || lineLower.includes(' - ') || lineLower.includes('periode')) {
        for (const m of STATEMENT_MONTHS) {
          if (lineLower.includes(m)) {
            const yearMatch = line.match(/\b(202\d)\b/)
            if (yearMatch) {
              statementPeriod = `${m.toUpperCase()} ${yearMatch[0]}`
              break
            }
          }
        }
      }
      if (statementPeriod !== 'Unknown Period') break
    }

    for (const page of pages) {
      const lines = page.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      
      // Locate header line indices
      let dateIdx = -1
      let sourceIdx = -1
      let descIdx = -1
      let amountIdx = -1
      let balanceIdx = -1

      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase()
        if (lower.includes('tanggal & waktu')) dateIdx = i
        else if (lower.includes('sumber/tujuan')) sourceIdx = i
        else if (lower.includes('rincian transaksi')) descIdx = i
        else if (lower.includes('jumlah')) amountIdx = i
        else if (lower.includes('saldo')) balanceIdx = i
      }

      if (dateIdx === -1 || amountIdx === -1) {
        continue
      }

      // Slice column sections
      const indices = [
        { label: 'date', idx: dateIdx },
        { label: 'source', idx: sourceIdx },
        { label: 'desc', idx: descIdx },
        { label: 'amount', idx: amountIdx },
        { label: 'balance', idx: balanceIdx }
      ].filter(item => item.idx !== -1).sort((a, b) => a.idx - b.idx)

      const columnLines: Record<string, string[]> = {}
      for (let i = 0; i < indices.length; i++) {
        const start = indices[i].idx + 1
        const end = i + 1 < indices.length ? indices[i + 1].idx : lines.length
        columnLines[indices[i].label] = lines.slice(start, end)
      }

      // 1. Parse dates from date column
      const pageDates: string[] = []
      const dateRegex = /\b(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})\b/
      let currentMonthYear = ''

      if (columnLines.date) {
        for (const line of columnLines.date) {
          const isMonthYear = /^[a-zA-Z]{3,12}\s+\d{4}$/.test(line)
          if (isMonthYear) {
            currentMonthYear = line
            continue
          }

          const match = line.match(dateRegex)
          if (match) {
            pageDates.push(line)
          } else {
            const dayMonthMatch = line.match(/\b(\d{1,2})\s+([a-zA-Z]{3,9})\b/)
            if (dayMonthMatch) {
              const yearMatch = currentMonthYear.match(/\b(202\d)\b/)
              const yearStr = yearMatch ? yearMatch[0] : '2024'
              pageDates.push(`${line} ${yearStr}`)
            }
          }
        }
      }

      // 2. Parse amounts from amount column
      const pageAmounts: { raw: string; value: number; type: string }[] = []
      if (columnLines.amount) {
        for (const line of columnLines.amount) {
          const cleanLine = line.replace(/,oo/gi, '').replace(/,00/gi, '')
          const isAmountLine = /^[-+]?\d{1,3}(\.\d{3})*(,\d{2})?$/.test(cleanLine) || /^[-+]?\d+$/.test(cleanLine)
          if (isAmountLine) {
            let cleanVal = cleanLine
            if (cleanLine.includes(',')) {
              cleanVal = cleanLine.split(',')[0]
            }
            cleanVal = cleanVal.replace(/\./g, '').replace(/,/g, '')
            const val = parseInt(cleanVal, 10)
            if (!isNaN(val)) {
              pageAmounts.push({
                raw: line,
                value: Math.abs(val),
                type: line.startsWith('+') ? 'income' : 'expense'
              })
            }
          }
        }
      }

      // 3. Parse descriptions
      let descriptions: string[] = []
      if (columnLines.source) {
        let currentSource = ''
        for (const line of columnLines.source) {
          const isNewItem = /^[A-Z]/.test(line) && !/^[A-Z]+$/.test(line)
          if (isNewItem && currentSource.length > 0) {
            descriptions.push(currentSource)
            currentSource = line
          } else {
            currentSource = currentSource ? `${currentSource} ${line}` : line
          }
        }
        if (currentSource) {
          descriptions.push(currentSource)
        }
      }

      // 4. Align columns by index
      const minLength = Math.min(pageDates.length, pageAmounts.length)
      for (let i = 0; i < minLength; i++) {
        const dateStr = pageDates[i]
        const amtObj = pageAmounts[i]
        
        let name = descriptions[i] || 'Transaction details'
        name = name.replace(/\d{9,20}/g, '').replace(/\s+/g, ' ').trim()
        if (name.length < 3) name = 'Transaction'

        // Format Date
        let formattedDate = new Date().toISOString().split('T')[0]
        const monthMap: Record<string, string> = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'mei': '05', 'jun': '06',
          'jul': '07', 'agu': '08', 'sep': '09', 'okt': '10', 'nov': '11', 'des': '12',
          'maret': '03', 'agustus': '08'
        }

        const parts = dateStr.split(/\s+/)
        if (parts.length >= 2) {
          const day = parts[0].padStart(2, '0')
          const monthStr = parts[1].toLowerCase().substring(0, 3)
          const month = monthMap[monthStr] || '01'
          const year = parts.length >= 3 ? parts[2] : '2024'
          formattedDate = `${year}-${month}-${day}`
        }

        // Categorize
        let category = 'Other'
        const nameLower = name.toLowerCase()
        for (const pattern of STATEMENT_CATEGORY_PATTERNS) {
          if (pattern.regex.test(nameLower)) {
            category = pattern.category
            break
          }
        }

        items.push({
          date: formattedDate,
          name,
          amount: amtObj.value,
          type: amtObj.type,
          category,
          bank: bankName
        })
      }
    }

    return {
      statementPeriod,
      items,
      totalItems: items.length,
      bank: bankName
    }
  }

  // Row-based layout (BSI / Default)
  let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  // 1. Period extraction
  let statementPeriod = 'Unknown Period'
  for (const line of lines) {
    const lineLower = line.toLowerCase()
    for (const m of STATEMENT_MONTHS) {
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
  let truncateIndex = lines.length
  for (let i = 0; i < lines.length; i++) {
    if (STATEMENT_STOP_KEYWORDS.some(keyword => lines[i].toLowerCase().includes(keyword))) {
      truncateIndex = i
      break
    }
  }
  lines = lines.slice(0, truncateIndex)

  // 2. Identify transaction rows/blocks
  // A transaction line starts with a date pattern:
  // e.g. "03 Des 2025" or "26 Des 2025" or "03/12/2025" or "03-12"
  const blockStartIndices: number[] = []
  
  for (let i = 0; i < lines.length; i++) {
    if (STATEMENT_DATE_REGEX.test(lines[i])) {
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

    for (let i = 1; i < blockLines.length; i++) {
      const line = blockLines[i]
      
      // Skip time line
      if (STATEMENT_TIME_REGEX.test(line)) continue
      
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
        if (!STATEMENT_REF_REGEX.test(line) && !line.toLowerCase().includes('reff') && !line.toLowerCase().includes('debit') && !line.toLowerCase().includes('kredit')) {
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

    const dateParts = dateStr.split(/\s+/)
    if (dateParts.length >= 2) {
      const day = dateParts[0].padStart(2, '0')
      const monthStr = dateParts[1].toLowerCase().replace(/[^a-z]/g, '')
      const month = STATEMENT_MONTH_MAP[monthStr] || '01'
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
    for (const pattern of STATEMENT_CATEGORY_PATTERNS) {
      if (pattern.regex.test(nameLower)) {
        category = pattern.category
        break
      }
    }

    // Ignore transactions that have 0 amount (usually header/footer rows)
    if (amount > 0) {
      items.push({
        date: formattedDate,
        name,
        amount,
        type,
        category,
        bank: bankName
      })
    }
  }

  return {
    statementPeriod,
    items,
    totalItems: items.length,
    bank: bankName
  }
}

async function extractTextWithOcrSpace(base64Data: string): Promise<string> {
  const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld'
  
  try {
    const dataUri = `data:application/pdf;base64,${base64Data}`
    const response = await ocrSpace(dataUri, {
      apiKey: apiKey,
      language: 'eng'
    })

    if (response && response.ParsedResults && response.ParsedResults.length > 0) {
      const rawText = response.ParsedResults.map((res: any) => res.ParsedText).join('\n---PAGE_BREAK---\n')
      if (rawText && rawText.trim().length > 0) {
        return rawText
      }
    }

    if (response && response.ErrorMessage) {
      throw new Error(Array.isArray(response.ErrorMessage) ? response.ErrorMessage.join(', ') : response.ErrorMessage)
    }

    throw new Error('No text detected in the PDF by OCR.space.')
  } catch (error: any) {
    console.error('OCR.space API Error:', error)
    throw new Error(error.message || 'Failed to process PDF with OCR.space')
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
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    
    let rawText: string
    if (isPdf) {
      rawText = await extractTextWithOcrSpace(base64Data)
    } else {
      rawText = await extractTextWithVisionAPI(base64Data)
    }
    
    console.log('Vision/OCR.space Text Extracted:', rawText)
    
    // Step 2: Local parsing without Gemini
    let parsed
    if (context === 'Receipt') {
      parsed = parseReceiptText(rawText)
    } else {
      parsed = parseBankStatementText(rawText)
    }
    
    return parsed
  } catch (error: any) {
    console.error('Error during OCR processing:', error)
    throw new Error(error.message || 'Failed to process document with OCR')
  }
}
