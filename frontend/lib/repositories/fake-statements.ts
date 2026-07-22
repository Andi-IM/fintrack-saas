import { Tables } from '@/lib/database.types'
import { assertStatementPeriodDate } from '@/lib/utils/statement-period'
import { StatementRepository } from './types'
import { readDB, writeDB } from './fs-mock-db'
import type { StatementPeriodDate } from './types'

export class FakeStatementRepository implements StatementRepository {
  async findAllWithItems(): Promise<(Tables<'bank_statements'> & { bank_statement_items: Tables<'bank_statement_items'>[] })[]> {
    const db = readDB()
    return db.statements.map((statement) => ({
      ...statement,
      bank_statement_items: db.statementItems.filter((item) => item.statement_id === statement.id)
    }))
  }

  async findById(id: string): Promise<Tables<'bank_statements'> | null> {
    const db = readDB()
    return db.statements.find((s) => s.id === id) || null
  }

  async delete(id: string, filePath: string): Promise<void> {
    const db = readDB()
    db.statements = db.statements.filter((s) => s.id !== id)
    db.statementItems = db.statementItems.filter((i) => i.statement_id !== id)
    writeDB(db)
  }

  async save(data: {
    bankName: string
    statementPeriod: StatementPeriodDate
    openingBalance: number | null
    closingBalance: number | null
    items: any[]
    file: File
  }): Promise<{ id: string }> {
    const id = `stmt-${Date.now()}`
    const db = readDB()
    assertStatementPeriodDate(data.statementPeriod)
    
    db.statements.push({
      id,
      bank_name: data.bankName,
      statement_period: data.statementPeriod,
      opening_balance: data.openingBalance || 0,
      closing_balance: data.closingBalance || 0,
      file_path: `fake/path/${data.file.name}`,
      total_items: data.items.length,
      metadata: {},
      created_at: new Date().toISOString()
    })

    const newItems = data.items.map((item, index) => ({
      id: `item-${Date.now()}-${index}`,
      statement_id: id,
      date: item.date,
      description: item.name,
      amount: item.amount,
      type: item.type,
      category: item.category || 'Other',
      balance: 0,
      metadata: {},
      cash_flow_id: null,
    }))

    db.statementItems.push(...newItems)
    writeDB(db)

    return { id }
  }

  async insertItems(items: any[]): Promise<void> {
    const db = readDB()
    db.statementItems.push(...items.map((item, index) => ({
      ...item,
      id: item.id || `item-inserted-${Date.now()}-${index}`,
      cash_flow_id: item.cash_flow_id || null,
    })))
    writeDB(db)
  }

  async deleteItem(itemId: string): Promise<Tables<'bank_statement_items'> | null> {
    const db = readDB()
    const item = db.statementItems.find((i) => i.id === itemId)
    if (!item) return null
    db.statementItems = db.statementItems.filter((i) => i.id !== itemId)
    writeDB(db)
    return item
  }

  async updateItem(
    itemId: string,
    data: {
      date: string
      description: string
      amount: number
      type: string
      category?: string | null
      balance?: number | null
      metadata?: any
    }
  ): Promise<{ statementId: string }> {
    const db = readDB()
    const index = db.statementItems.findIndex((i) => i.id === itemId)
    if (index === -1) throw new Error('Item not found')

    const existing = db.statementItems[index]
    db.statementItems[index] = {
      ...existing,
      date: data.date,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category ?? existing.category,
      balance: data.balance ?? existing.balance,
      metadata: data.metadata ?? existing.metadata
    }
    writeDB(db)
    return { statementId: existing.statement_id! }
  }

  async addItem(data: {
    statement_id: string
    date: string
    description: string
    amount: number
    type: string
    category?: string | null
    balance?: number
  }): Promise<void> {
    const db = readDB()
    const isManual = data.balance !== undefined
    const metadata = isManual ? { manual_balance: true as any } : {}
    
    db.statementItems.push({
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      statement_id: data.statement_id,
      date: data.date,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category ?? null,
      balance: data.balance ?? 0,
      metadata,
      cash_flow_id: null,
    })
    writeDB(db)
  }

  async findItemsByStatementId(statementId: string): Promise<Tables<'bank_statement_items'>[]> {
    const db = readDB()
    return db.statementItems
      .filter(i => i.statement_id === statementId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id))
  }

  async updateItemBalance(itemId: string, balance: number): Promise<void> {
    const db = readDB()
    const index = db.statementItems.findIndex(i => i.id === itemId)
    if (index !== -1) {
      db.statementItems[index].balance = balance
      writeDB(db)
    }
  }

  async updateClosingBalance(statementId: string, closingBalance: number, totalItems: number): Promise<void> {
    const db = readDB()
    const index = db.statements.findIndex(s => s.id === statementId)
    if (index !== -1) {
      db.statements[index].closing_balance = closingBalance
      db.statements[index].total_items = totalItems
      writeDB(db)
    }
  }

  async getSignedUrl(path: string): Promise<string> {
    return `fake-url-for-${path}`
  }

  async uploadFile(path: string, buffer: Buffer, contentType: string): Promise<void> {}

  async removeFile(path: string): Promise<void> {}

  async upload(path: string, buffer: Buffer, contentType: string): Promise<{ path: string }> {
    return { path }
  }

  async remove(paths: string[]): Promise<void> {}

  async checkExistingForBank(bankName: string): Promise<Pick<Tables<'bank_statements'>, 'id' | 'statement_period' | 'file_path'>[]> {
    const db = readDB()
    return db.statements
      .filter((s) => s.bank_name === bankName)
      .map((s) => ({ id: s.id, statement_period: s.statement_period, file_path: s.file_path }))
  }
}
