export interface OCRResult {
  merchant?: string
  items?: (ReceiptItem | BankTransaction)[]
  total?: number
  category?: string
  statementPeriod?: string
  totalItems?: number
  bank?: string
}

export interface ReceiptItem {
  name: string
  amount: number
}

export interface BankTransaction {
  date: string
  name: string
  amount: number
  type: 'income' | 'expense'
  category: string
  bank: string
}
