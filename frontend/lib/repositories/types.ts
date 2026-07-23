import { Tables } from '@/lib/database.types'

declare const statementPeriodDateBrand: unique symbol

export type StatementPeriodDate = string & {
  readonly [statementPeriodDateBrand]: 'StatementPeriodDate'
}

export interface CashFlowFilterOptions {
  range?: string
  date?: string
  search?: string
  category?: string
  payment_method?: string
  source?: string
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  count: number
}

export type DashboardCashFlowEntry = Pick<
  Tables<'cash_flow'>,
  'id' | 'date' | 'main_category' | 'description' | 'income' | 'expense' | 'payment_method'
>

// Interface representing the cash flow database access layer
export interface CashFlowRepository {
  findAll(options?: CashFlowFilterOptions): Promise<PaginatedResult<Tables<'cash_flow'>>>
  findDashboardEntries(options?: Pick<CashFlowFilterOptions, 'range'>): Promise<DashboardCashFlowEntry[]>
  findById(id: string): Promise<Tables<'cash_flow'> | null>
  create(data: Omit<Tables<'cash_flow'>, 'id' | 'created_at' | 'user_id' | 'source_item_id'> & { source_item_id?: string | null }): Promise<Tables<'cash_flow'>>
  update(id: string, data: Partial<Omit<Tables<'cash_flow'>, 'id' | 'created_at' | 'user_id'>>): Promise<void>
  delete(id: string): Promise<void>
}

export interface StatementRepository {
  findAllWithItems(): Promise<Tables<'bank_statements'>[]>
  findById(id: string): Promise<Tables<'bank_statements'> | null>
  delete(id: string, filePath: string): Promise<void>

  save({
    bankName,
    statementPeriod,
    openingBalance,
    closingBalance,
    items,
    file,
  }: {
    bankName: string
    statementPeriod: StatementPeriodDate
    openingBalance: number | null
    closingBalance: number | null
    items: any[]
    file: File
  }): Promise<{ id: string }>

  insertItems(items: any[]): Promise<void>
  deleteItem(itemId: string): Promise<Tables<'bank_statement_items'> | null>
  updateItem(
    itemId: string,
    data: {
      date: string
      description: string
      amount: number
      type: string
      category?: string | null
      balance?: number | null
      metadata?: Record<string, unknown>
    }
  ): Promise<{ statementId: string }>
  addItem(data: {
    statement_id: string
    date: string
    description: string
    amount: number
    type: string
    category?: string | null
    balance?: number
  }): Promise<void>
  findItemsByStatementId(statementId: string): Promise<Tables<'bank_statement_items'>[]>
  updateItemBalance(itemId: string, balance: number): Promise<void>
  updateClosingBalance(itemId: string, closingBalance: number, totalItems: number): Promise<void>
  
  getSignedUrl(path: string): Promise<string>
  uploadFile(path: string, buffer: Buffer, contentType: string): Promise<void>
  removeFile(path: string): Promise<void>
  
  upload(path: string, buffer: Buffer, contentType: string): Promise<{ path: string }>
  remove(paths: string[]): Promise<void>

  checkExistingForBank(bankName: string): Promise<Pick<Tables<'bank_statements'>, 'id' | 'statement_period' | 'file_path'>[]>
}
