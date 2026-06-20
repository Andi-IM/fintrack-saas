import { Tables } from '@/lib/database.types'
import { StatementRepository } from './statements'

export class FakeStatementRepository implements StatementRepository {
  public statements: Tables<'bank_statements'>[] = []
  public items: Tables<'bank_statement_items'>[] = []

  async findAllWithItems(): Promise<(Tables<'bank_statements'> & { bank_statement_items: Tables<'bank_statement_items'>[] })[]> {
    return this.statements.map((statement) => ({
      ...statement,
      bank_statement_items: this.items.filter((item) => item.statement_id === statement.id)
    }))
  }

  async findById(id: string): Promise<Tables<'bank_statements'> | null> {
    return this.statements.find((s) => s.id === id) || null
  }

  async delete(id: string, filePath: string): Promise<void> {
    this.statements = this.statements.filter((s) => s.id !== id)
    this.items = this.items.filter((i) => i.statement_id !== id)
  }

  async save(data: {
    bankName: string
    statementPeriod: string
    openingBalance: number | null
    closingBalance: number | null
    items: any[]
    file: File
  }): Promise<{ id: string }> {
    const id = `stmt-${Date.now()}`
    this.statements.push({
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

    this.items.push(...newItems)

    return { id }
  }

  async insertItems(items: any[]): Promise<void> {
    this.items.push(...items.map((item, index) => ({
      ...item,
      id: item.id || `item-inserted-${Date.now()}-${index}`,
      cash_flow_id: item.cash_flow_id || null,
    })))
  }

  async deleteItem(itemId: string): Promise<Tables<'bank_statement_items'> | null> {
    const item = this.items.find((i) => i.id === itemId)
    if (!item) return null
    this.items = this.items.filter((i) => i.id !== itemId)
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
    const index = this.items.findIndex((i) => i.id === itemId)
    if (index === -1) throw new Error('Item not found')

    const existing = this.items[index]
    this.items[index] = {
      ...existing,
      date: data.date,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category ?? existing.category,
      balance: data.balance ?? existing.balance,
      metadata: data.metadata ?? existing.metadata,
    }

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
    this.items.push({
      id: `item-added-${Date.now()}`,
      statement_id: data.statement_id,
      date: data.date,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category ?? null,
      balance: data.balance ?? 0,
      metadata: {},
      cash_flow_id: null,
    })
  }

  async findItemsByStatementId(statementId: string): Promise<Tables<'bank_statement_items'>[]> {
    return this.items.filter((i) => i.statement_id === statementId).sort((a, b) => a.date.localeCompare(b.date))
  }

  async updateItemBalance(itemId: string, balance: number): Promise<void> {
    const item = this.items.find((i) => i.id === itemId)
    if (item) item.balance = balance
  }

  async updateClosingBalance(statementId: string, closingBalance: number, totalItems: number): Promise<void> {
    const statement = this.statements.find((s) => s.id === statementId)
    if (statement) {
      statement.closing_balance = closingBalance
      statement.total_items = totalItems
    }
  }

  async getSignedUrl(path: string): Promise<string> {
    return `https://fake-signed-url.com/${path}`
  }

  async uploadFile(path: string, buffer: Buffer, contentType: string): Promise<void> {
    // Fake upload
  }

  async removeFile(path: string): Promise<void> {
    // Fake remove
  }

  async upload(path: string, buffer: Buffer, contentType: string): Promise<{ path: string }> {
    return { path }
  }

  async remove(paths: string[]): Promise<void> {
    // Fake remove
  }

  async checkExistingForBank(bankName: string): Promise<Pick<Tables<'bank_statements'>, 'id' | 'statement_period' | 'file_path'>[]> {
    return this.statements
      .filter((s) => s.bank_name === bankName)
      .map((s) => ({ id: s.id, statement_period: s.statement_period, file_path: s.file_path }))
  }
}
