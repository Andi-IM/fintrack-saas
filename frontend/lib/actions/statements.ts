'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { STATEMENT_MONTH_MAP } from '@/lib/constants/ocr'
import { revalidatePath } from 'next/cache'
import { Tables } from '@/lib/database.types'
import { ActionResponse } from './types'

export type BankStatementWithItems = Tables<'bank_statements'> & {
  bank_statement_items: Tables<'bank_statement_items'>[]
}

export async function getGroupedBankStatements(): Promise<ActionResponse<Record<string, BankStatementWithItems[]>>> {
  const supabase = await createClient()

  const { data: statements, error } = await supabase
    .from('bank_statements')
    .select(`
      *,
      bank_statement_items (*)
    `)
    .order('bank_name', { ascending: true })
    .order('created_at', { ascending: false })
    .order('date', { ascending: true, foreignTable: 'bank_statement_items' })
    .order('id', { ascending: true, foreignTable: 'bank_statement_items' })

  if (error) {
    console.error('Error fetching bank statements:', error)
    return { success: false, error: 'Failed to fetch bank statements' }
  }

  const grouped = (statements || []).reduce((acc: Record<string, BankStatementWithItems[]>, statement) => {
    const bank = statement.bank_name
    if (!acc[bank]) {
      acc[bank] = []
    }
    acc[bank].push(statement as BankStatementWithItems)
    return acc
  }, {})

  return { success: true, data: grouped }
}

export async function getFileUrl(path: string): Promise<ActionResponse<string>> {
  const supabase = await createClient()
  
  const { data, error } = await supabase.storage
    .from('statements')
    .createSignedUrl(path, 3600) // 1 hour expiry

  if (error) {
    console.error('Error creating signed URL:', error)
    return { success: false, error: 'Failed to get file access' }
  }

  return { success: true, data: data.signedUrl }
}

export async function deleteBankStatement(id: string, filePath: string): Promise<ActionResponse<void>> {
  const supabase = await createClient()

  // 1. Delete from database first (cascade will handle bank_statement_items)
  // This is the source of truth; if this fails, we don't want to delete the file.
  const { error: dbError } = await supabase
    .from('bank_statements')
    .delete()
    .eq('id', id)

  if (dbError) {
    console.error('Error deleting statement from DB:', dbError)
    return { success: false, error: `Failed to delete statement from database: ${dbError.message}` }
  }

  // 2. Delete file from storage only after DB record is successfully removed
  const { error: storageError } = await supabase.storage
    .from('statements')
    .remove([filePath])

  if (storageError) {
    console.error('Error deleting file from storage:', storageError)
    // We don't throw here because the DB record is already gone.
    // The file is now an orphan, which is better than a broken DB link.
  }

  revalidatePath('/')
  return { success: true, data: undefined }
}

const saveStatementSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  statementPeriod: z.string().min(1, 'Statement period is required'),
  openingBalance: z.number().optional(),
  closingBalance: z.number().optional(),
  items: z.array(z.object({
    date: z.string(),
    name: z.string(),
    amount: z.number(),
    type: z.enum(['income', 'expense']),
    category: z.string().optional(),
  })),
})

interface SaveStatementInput extends z.infer<typeof saveStatementSchema> {
  file: File
}

interface MonthYear {
  year: number
  month: number
}

function parseMonthYear(monthStr: string, yearStr: string): MonthYear {
  const cleanMonth = monthStr.toLowerCase().substring(0, 3)
  const monthNum = parseInt(STATEMENT_MONTH_MAP[cleanMonth] || '01', 10)
  const yearNum = parseInt(yearStr, 10)
  return { month: monthNum, year: yearNum }
}

function getPeriodRange(period: string): { startVal: number; endVal: number } | null {
  const rangeRegex = /\b([a-zA-Z]{3,9})\s+(\d{4})\s*-\s*([a-zA-Z]{3,9})\s+(\d{4})\b/i
  const matchRange = period.match(rangeRegex)
  if (matchRange) {
    const start = parseMonthYear(matchRange[1], matchRange[2])
    const end = parseMonthYear(matchRange[3], matchRange[4])
    return {
      startVal: start.year * 12 + start.month,
      endVal: end.year * 12 + end.month
    }
  }

  const singleRegex = /\b([a-zA-Z]{3,9})\s+(\d{4})\b/i
  const matchSingle = period.match(singleRegex)
  if (matchSingle) {
    const single = parseMonthYear(matchSingle[1], matchSingle[2])
    const val = single.year * 12 + single.month
    return { startVal: val, endVal: val }
  }

  return null
}

function compareRanges(
  newRange: { startVal: number; endVal: number },
  oldRange: { startVal: number; endVal: number }
): 'subset_or_duplicate' | 'superset' | 'overlap' | 'none' {
  const { startVal: newStart, endVal: newEnd } = newRange
  const { startVal: oldStart, endVal: oldEnd } = oldRange

  if (newStart >= oldStart && newEnd <= oldEnd) {
    return 'subset_or_duplicate'
  }
  if (newStart <= oldStart && newEnd >= oldEnd) {
    return 'superset'
  }
  if (newStart <= oldEnd && oldStart <= newEnd) {
    return 'overlap'
  }
  return 'none'
}

export interface BankAnalyticsSummary {
  bankName: string
  latestBalance: number
  latestPeriod: string
  statementsCount: number
  totalIncome: number
  totalExpense: number
}

export interface DailyTransaction {
  description: string
  amount: number
  type: string
  category: string | null
}

export interface DailyBalancePoint {
  bankName: string
  date: string
  balance: number
  transactions: DailyTransaction[]
}

export interface StatementAnalytics {
  netWorth: number
  totalIncome: number
  totalExpense: number
  bankSummaries: BankAnalyticsSummary[]
  balanceHistory: DailyBalancePoint[]
}

export async function getStatementAnalytics(): Promise<ActionResponse<StatementAnalytics>> {
  const supabase = await createClient()

  const { data: statements, error } = await supabase
    .from('bank_statements')
    .select(`
      *,
      bank_statement_items (*)
    `)

  if (error) {
    console.error('Error fetching bank statements:', error)
    return { success: false, error: 'Failed to fetch bank statements' }
  }

  if (!statements || statements.length === 0) {
    return {
      success: true,
      data: {
        netWorth: 0,
        totalIncome: 0,
        totalExpense: 0,
        bankSummaries: [],
        balanceHistory: [],
      }
    }
  }

  const typedStatements = statements as BankStatementWithItems[]
  const grouped = typedStatements.reduce((acc, s) => {
    if (!acc[s.bank_name]) acc[s.bank_name] = []
    acc[s.bank_name].push(s)
    return acc
  }, {} as Record<string, BankStatementWithItems[]>)

  const bankSummaries: BankAnalyticsSummary[] = []
  const balanceHistory: DailyBalancePoint[] = []
  let totalIncome = 0
  let totalExpense = 0

  for (const [bankName, stmts] of Object.entries(grouped)) {
    const withRange = stmts.map(s => ({
      ...s,
      range: getPeriodRange(s.statement_period)
    }))

    const sortedAsc = [...withRange].sort((a, b) => {
      const endA = a.range?.endVal ?? 0
      const endB = b.range?.endVal ?? 0
      return endA - endB
    })

    const latest = [...sortedAsc].sort((a, b) => {
      const endA = a.range?.endVal ?? 0
      const endB = b.range?.endVal ?? 0
      return endB - endA
    })[0]

    const bankIncome = stmts.reduce((sum, s) =>
      sum + (s.bank_statement_items || []).filter(i => i.type === 'income').reduce((a, i) => a + i.amount, 0), 0)
    const bankExpense = stmts.reduce((sum, s) =>
      sum + (s.bank_statement_items || []).filter(i => i.type === 'expense').reduce((a, i) => a + i.amount, 0), 0)

    totalIncome += bankIncome
    totalExpense += bankExpense

    bankSummaries.push({
      bankName,
      latestBalance: latest.closing_balance || 0,
      latestPeriod: latest.statement_period,
      statementsCount: stmts.length,
      totalIncome: bankIncome,
      totalExpense: bankExpense,
    })

    // Compute daily running balance timeline with transaction details
    let runningBalance = 0
    let isFirstStatement = true

    for (const stmt of sortedAsc) {
      const items = (stmt.bank_statement_items || [])
        .filter(i => i.date && i.amount != null && i.type)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      if (isFirstStatement) {
        runningBalance = stmt.opening_balance ?? 0
        isFirstStatement = false
      }

      const dailyMap = new Map<string, { balance: number; transactions: DailyTransaction[] }>()

      for (const item of items) {
        const dateKey = item.date.slice(0, 10)

        if (item.type === 'income') runningBalance += item.amount
        else runningBalance -= item.amount

        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, { balance: runningBalance, transactions: [] })
        }
        dailyMap.get(dateKey)!.balance = runningBalance
        dailyMap.get(dateKey)!.transactions.push({
          description: item.description,
          amount: item.amount,
          type: item.type || 'expense',
          category: item.category,
        })
      }

      for (const [date, point] of [...dailyMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        balanceHistory.push({
          bankName,
          date,
          balance: point.balance,
          transactions: point.transactions,
        })
      }
    }
  }

  bankSummaries.sort((a, b) => b.latestBalance - a.latestBalance)

  return {
    success: true,
    data: {
      netWorth: bankSummaries.reduce((sum, b) => sum + b.latestBalance, 0),
      totalIncome,
      totalExpense,
      bankSummaries,
      balanceHistory,
    }
  }
}

export async function saveBankStatement({ 
  bankName, 
  statementPeriod, 
  openingBalance,
  closingBalance,
  items, 
  file 
}: SaveStatementInput): Promise<ActionResponse<{ statementId: string }>> {
  const parsed = saveStatementSchema.safeParse({ bankName, statementPeriod, openingBalance, closingBalance, items })
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()

  // 1. Check for duplicate or overlapping statements
  const { data: existingStatements, error: checkError } = await supabase
    .from('bank_statements')
    .select('id, statement_period, file_path')
    .eq('bank_name', bankName)

  if (checkError) {
    console.error('Error checking for duplicate statements:', checkError)
    return { success: false, error: `Failed to check for duplicate statements: ${checkError.message}` }
  }

  const newRange = getPeriodRange(statementPeriod)

  if (existingStatements && existingStatements.length > 0) {
    for (const existing of existingStatements) {
      const oldRange = getPeriodRange(existing.statement_period)
      
      if (newRange && oldRange) {
        const relation = compareRanges(newRange, oldRange)
        
        if (relation === 'subset_or_duplicate') {
          return { success: false, error: `Laporan mutasi untuk ${bankName} dengan periode ${statementPeriod} sudah tercakup oleh laporan periode ${existing.statement_period} yang diunggah sebelumnya.` }
        } else if (relation === 'superset') {
          console.log(`Replacing existing statement ${existing.id} (${existing.statement_period}) with new statement (${statementPeriod})`)
          
          // Delete from database (cascade deletes items)
          const { error: deleteDbError } = await supabase
            .from('bank_statements')
            .delete()
            .eq('id', existing.id)

          if (deleteDbError) {
            console.error('Failed to delete duplicate statement from DB:', deleteDbError)
          } else {
            // Delete file from storage
            await supabase.storage
              .from('statements')
              .remove([existing.file_path])
          }
        } else if (relation === 'overlap') {
          return { success: false, error: `Laporan mutasi yang diunggah (${statementPeriod}) tumpang tindih dengan laporan periode ${existing.statement_period}. Harap periksa kembali berkas Anda untuk menghindari duplikasi transaksi.` }
        }
      } else {
        // Fallback to simple string match if parsing fails
        if (existing.statement_period === statementPeriod) {
          return { success: false, error: `Laporan mutasi untuk ${bankName} dengan periode ${statementPeriod} sudah pernah diunggah sebelumnya.` }
        }
      }
    }
  }

  // 2. Upload file to Supabase Storage
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  const fileExt = file.name.split('.').pop() || 'pdf'
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
  const folder = bankName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const filePath = `${folder}/${uniqueName}`

  const { error: uploadError } = await supabase.storage
    .from('statements')
    .upload(filePath, buffer, {
      contentType: file.type || 'application/pdf',
      duplex: 'half'
    })

  if (uploadError) {
    console.error('Error uploading statement file:', uploadError)
    return { success: false, error: 'Failed to upload bank statement file' }
  }

  // 2. Insert statement metadata
  const { data: statement, error: statementError } = await supabase
    .from('bank_statements')
    .insert({
      bank_name: bankName,
      statement_period: statementPeriod,
      file_path: filePath,
      total_items: items.length,
      opening_balance: openingBalance || 0,
      closing_balance: closingBalance || 0,
      metadata: {}
    })
    .select()
    .single()

  if (statementError) {
    console.error('Error creating bank statement record:', statementError)
    // Attempt to clean up uploaded file
    await supabase.storage.from('statements').remove([filePath])
    return { success: false, error: 'Failed to save statement records' }
  }

  // 3. Insert statement items with running balance
  if (items.length > 0) {
    let runningBalance = openingBalance ?? 0
    const itemsToInsert = items.map(item => {
      if (item.type === 'income') runningBalance += item.amount
      else runningBalance -= item.amount

      return {
        statement_id: statement.id,
        date: item.date,
        description: item.name,
        amount: item.amount,
        type: item.type,
        category: item.category || 'Other',
        balance: runningBalance,
        metadata: {}
      }
    })

    const { error: itemsError } = await supabase
      .from('bank_statement_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error saving statement items:', itemsError)
      // Rollback statement metadata
      await supabase.from('bank_statements').delete().eq('id', statement.id)
      await supabase.storage.from('statements').remove([filePath])
      return { success: false, error: 'Failed to save statement items records' }
    }
  }

  return { success: true, data: { statementId: statement.id } }
}

// ──────────────────────────────────────────────
// Statement Item CRUD
// ──────────────────────────────────────────────

const statementItemSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  type: z.enum(['income', 'expense']),
  category: z.string().optional(),
})

async function recalculateStatementBalances(statementId: string): Promise<void> {
  const supabase = await createClient()

  const { data: statement, error: stmtErr } = await supabase
    .from('bank_statements')
    .select('opening_balance')
    .eq('id', statementId)
    .single()

  if (stmtErr || !statement) {
    console.error('Error fetching statement for recalculation:', stmtErr)
    return
  }

  const { data: items, error: itemsErr } = await supabase
    .from('bank_statement_items')
    .select('id, date, amount, type')
    .eq('statement_id', statementId)
    .order('date', { ascending: true })
    .order('id', { ascending: true })

  if (itemsErr || !items) {
    console.error('Error fetching items for recalculation:', itemsErr)
    return
  }

  let runningBalance = statement.opening_balance ?? 0
  const totalItems = items.length
  let lastBalance = 0

  for (const item of items) {
    if (item.type === 'income') runningBalance += item.amount
    else runningBalance -= item.amount
    lastBalance = runningBalance

    const { error: updateErr } = await supabase
      .from('bank_statement_items')
      .update({ balance: runningBalance })
      .eq('id', item.id)

    if (updateErr) {
      console.error(`Error updating balance for item ${item.id}:`, updateErr)
    }
  }

  const { error: closeErr } = await supabase
    .from('bank_statements')
    .update({ closing_balance: lastBalance, total_items: totalItems })
    .eq('id', statementId)

  if (closeErr) {
    console.error('Error updating statement closing balance:', closeErr)
  }
}

export async function updateStatementItem(
  itemId: string,
  input: z.input<typeof statementItemSchema>
): Promise<ActionResponse<void>> {
  const parsed = statementItemSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()

  const { data: item } = await supabase
    .from('bank_statement_items')
    .select('statement_id')
    .eq('id', itemId)
    .single()

  if (!item) {
    return { success: false, error: 'Item not found' }
  }

  const { error: updateErr } = await supabase
    .from('bank_statement_items')
    .update({
      date: parsed.data.date,
      description: parsed.data.description,
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category || null,
    })
    .eq('id', itemId)

  if (updateErr) {
    console.error('Error updating statement item:', updateErr)
    return { success: false, error: 'Failed to update statement item' }
  }

  await recalculateStatementBalances(item.statement_id)

  revalidatePath('/')
  return { success: true }
}

export async function deleteStatementItem(itemId: string): Promise<ActionResponse<void>> {
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('bank_statement_items')
    .select('statement_id')
    .eq('id', itemId)
    .single()

  if (!item) {
    return { success: false, error: 'Item not found' }
  }

  const { error: deleteErr } = await supabase
    .from('bank_statement_items')
    .delete()
    .eq('id', itemId)

  if (deleteErr) {
    console.error('Error deleting statement item:', deleteErr)
    return { success: false, error: 'Failed to delete statement item' }
  }

  await recalculateStatementBalances(item.statement_id)

  revalidatePath('/')
  return { success: true }
}

export async function addStatementItem(
  statementId: string,
  input: z.input<typeof statementItemSchema>
): Promise<ActionResponse<void>> {
  const parsed = statementItemSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()

  const { error: insertErr } = await supabase
    .from('bank_statement_items')
    .insert({
      statement_id: statementId,
      date: parsed.data.date,
      description: parsed.data.description,
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category || null,
      balance: 0,
    })

  if (insertErr) {
    console.error('Error adding statement item:', insertErr)
    return { success: false, error: 'Failed to add statement item' }
  }

  await recalculateStatementBalances(statementId)

  revalidatePath('/')
  return { success: true }
}

