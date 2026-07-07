'use server'

import { z } from 'zod'
import { invalidateCache } from '@/lib/cache'
import { getStatementRepository } from '@/lib/repositories/statements'
import { STATEMENT_MONTH_MAP } from '@/lib/constants/ocr'
import { Tables } from '@/lib/database.types'
import { ActionResponse } from '@/lib/actions/types'

export type BankStatementWithItems = Tables<'bank_statements'> & {
  bank_statement_items: Tables<'bank_statement_items'>[]
}

export async function getGroupedBankStatements(): Promise<ActionResponse<Record<string, BankStatementWithItems[]>>> {
  const repo = getStatementRepository()
  try {
    const statements = await repo.findAllWithItems()

    const grouped = (statements || []).reduce((acc: Record<string, BankStatementWithItems[]>, statement) => {
      const bank = statement.bank_name
      if (!acc[bank]) acc[bank] = []
      acc[bank].push(statement as BankStatementWithItems)
      return acc
    }, {})

    const periodRangeCache = new Map<string, number>()
    const getCachedEndVal = (period: string | null) => {
      if (!period) return 0
      let val = periodRangeCache.get(period)
      if (val === undefined) {
        const range = getPeriodRange(period)
        val = range ? range.endVal : 0
        periodRangeCache.set(period, val)
      }
      return val
    }

    for (const statements of Object.values(grouped)) {
      statements.sort((a, b) => {
        const diff = getCachedEndVal(b.statement_period) - getCachedEndVal(a.statement_period)
        if (diff !== 0) return diff
        
        // Tie-breaker for deterministic sorting when periods are equal or null/invalid
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        if (dateB !== dateA) return dateB - dateA
        
        // Final fallback if created_at is identical or missing
        return b.id.localeCompare(a.id)
      })
    }

    return { success: true, data: grouped }
  } catch (error: any) {
    console.error('Error fetching bank statements:', error)
    return { success: false, error: 'Failed to fetch bank statements' }
  }
}

export async function getFileUrl(path: string): Promise<ActionResponse<string>> {
  const repo = getStatementRepository()
  try {
    const url = await repo.getSignedUrl(path)
    return { success: true, data: url }
  } catch (error: any) {
    console.error('Error creating signed URL:', error)
    return { success: false, error: 'Failed to get file access' }
  }
}

export async function deleteBankStatement(id: string, filePath: string): Promise<ActionResponse<void>> {
  const repo = getStatementRepository()

  await repo.delete(id, filePath)
  await repo.removeFile(filePath)

  invalidateCache(['/'])
  return { success: true, data: undefined }
}

const saveStatementSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  statementPeriod: z.string().min(1, 'Statement period is required'),
  openingBalance: z.number().optional(),
  closingBalance: z.number().optional(),
  items: z.array(z.object({
    date: z.string().min(1, 'Date is required'),
    name: z.string().min(1, 'Description is required'),
    amount: z.number().positive('Amount must be greater than 0'),
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
      endVal: end.year * 12 + end.month,
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

  if (newStart >= oldStart && newEnd <= oldEnd) return 'subset_or_duplicate'
  if (newStart <= oldStart && newEnd >= oldEnd) return 'superset'
  if (newStart <= oldEnd && oldStart <= newEnd) return 'overlap'
  return 'none'
}

export interface BankAnalyticsSummary {
  bankName: string
  latestBalance: number
  latestPeriod: string
  statementsCount: number
  totalIncome: number
  totalExpense: number
  openingBalance: number
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
  const repo = getStatementRepository()

  const statements = await repo.findAllWithItems()

  if (!statements || statements.length === 0) {
    return {
      success: true,
      data: {
        netWorth: 0,
        totalIncome: 0,
        totalExpense: 0,
        bankSummaries: [],
        balanceHistory: [],
      },
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
    const withRange = stmts.map(s => ({ ...s, range: getPeriodRange(s.statement_period) }))

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

    const earliest = sortedAsc[0]
    const openingBalance = earliest?.opening_balance ?? 0

    bankSummaries.push({
      bankName,
      latestBalance: latest.closing_balance || 0,
      latestPeriod: latest.statement_period,
      statementsCount: stmts.length,
      totalIncome: bankIncome,
      totalExpense: bankExpense,
      openingBalance: Number(openingBalance),
    })

    let runningBalance = 0
    let isFirstStatement = true

    for (const stmt of sortedAsc) {
      const items = (stmt.bank_statement_items || [])
        .filter(i => i.date && i.amount != null && i.type)
        .sort((a, b) => {
          const timeA = new Date(a.date).getTime()
          const timeB = new Date(b.date).getTime()
          if (timeA !== timeB) return timeA - timeB
          return a.id.localeCompare(b.id)
        })

      if (isFirstStatement) {
        runningBalance = stmt.opening_balance ?? 0
        isFirstStatement = false
      }

      const dailyMap = new Map<string, { balance: number; transactions: DailyTransaction[] }>()

      for (const item of items) {
        const dateKey = item.date.slice(0, 10)

        if (item.balance !== null && item.balance !== undefined) {
          runningBalance = Number(item.balance)
        } else {
          if (item.type === 'income') runningBalance += item.amount
          else runningBalance -= item.amount
        }

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
    },
  }
}

export async function saveBankStatement({
  bankName,
  statementPeriod,
  openingBalance,
  closingBalance,
  items,
  file,
}: SaveStatementInput): Promise<ActionResponse<{ statementId: string }>> {
  const parsed = saveStatementSchema.safeParse({
    bankName,
    statementPeriod,
    openingBalance,
    closingBalance,
    items,
  })
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const repo = getStatementRepository()
  try {
    const existingStatements = await repo.checkExistingForBank(bankName)

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
            await repo.delete(existing.id, existing.file_path)
            await repo.removeFile(existing.file_path)
          } else if (relation === 'overlap') {
            return { success: false, error: `Laporan mutasi yang diunggah (${statementPeriod}) tumpang tindih dengan laporan periode ${existing.statement_period}. Harap periksa kembali berkas Anda untuk menghindari duplikasi transaksi.` }
          }
        } else {
          if (existing.statement_period === statementPeriod) {
            return { success: false, error: `Laporan mutasi untuk ${bankName} dengan periode ${statementPeriod} sudah pernah diunggah sebelumnya.` }
          }
        }
      }
    }

    const statement = await repo.save({
      bankName,
      statementPeriod,
      openingBalance: openingBalance ?? 0,
      closingBalance: closingBalance ?? 0,
      items,
      file,
    })

    return { success: true, data: { statementId: statement.id } }
  } catch (error: any) {
    console.error('Error saving bank statement:', error)
    return { success: false, error: error.message || 'Failed to save bank statement' }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Statement Item CRUD
// ──────────────────────────────────────────────────────────────────────────────

const statementItemSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  type: z.enum(['income', 'expense']),
  category: z.string().optional(),
  balance: z.number().optional(),
})

async function recalculateStatementBalances(statementId: string): Promise<void> {
  const repo = getStatementRepository()
  const statement = await repo.findById(statementId)
  if (!statement) {
    console.error('Error fetching statement for recalculation')
    return
  }
  const items = await repo.findItemsByStatementId(statementId)
  let runningBalance = statement.opening_balance ?? 0
  const totalItems = items.length
  let lastBalance = runningBalance
  for (const item of items) {
    const metadata = item.metadata as Record<string, unknown> | null
    const isManual = metadata !== null && typeof metadata === 'object' && metadata.manual_balance === true
    if (isManual && item.balance !== null && item.balance !== undefined) {
      runningBalance = Number(item.balance)
    } else {
      if (item.type === 'income') runningBalance += item.amount
      else runningBalance -= item.amount
      await repo.updateItemBalance(item.id, runningBalance)
    }
    lastBalance = runningBalance
  }
  await repo.updateClosingBalance(statementId, lastBalance, totalItems)
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

  try {
    const repo = getStatementRepository()
    const result = await repo.updateItem(itemId, {
      date: parsed.data.date,
      description: parsed.data.description,
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category ?? null,
      balance: parsed.data.balance,
    })

    await recalculateStatementBalances(result.statementId)
    invalidateCache(['/'])
    return { success: true }
  } catch (error: any) {
    console.error('Error updating statement item:', error)
    return { success: false, error: 'Failed to update statement item' }
  }
}

export async function deleteStatementItem(itemId: string): Promise<ActionResponse<void>> {
  const repo = getStatementRepository()

  try {
    const result = await repo.deleteItem(itemId)
    if (!result) {
      return { success: false, error: 'Item not found' }
    }
    if (!result.statement_id) {
      return { success: false, error: 'Statement ID is missing from the item' }
    }

    await recalculateStatementBalances(result.statement_id)
    invalidateCache(['/'])
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting statement item:', error)
    return { success: false, error: 'Failed to delete statement item' }
  }
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

  const repo = getStatementRepository()
  try {
    await repo.addItem({
      statement_id: statementId,
      date: parsed.data.date,
      description: parsed.data.description,
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category ?? null,
      balance: parsed.data.balance ?? 0,
    })

    await recalculateStatementBalances(statementId)
    invalidateCache(['/'])
    return { success: true }
  } catch (error: any) {
    console.error('Error adding statement item:', error)
    return { success: false, error: 'Failed to add statement item' }
  }
}
