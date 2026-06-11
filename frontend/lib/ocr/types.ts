export interface OCRResult {
  merchant?: string
  items?: (ReceiptItem | BankTransaction)[]
  total?: number
  category?: string
  statementPeriod?: string
  totalItems?: number
  bank?: string
  openingBalance?: number
  closingBalance?: number
  address?: string
  date?: string
  paymentMethod?: string
  amountPaid?: number
  change?: number
  type?: 'shopping' | 'atm'
  atmId?: string
  transactionType?: 'withdrawal' | 'deposit' | 'transfer'
  fee?: number
}

export interface ReceiptItem {
  name: string
  amount: number
  quantity?: number
  price?: number
}

export interface BankTransaction {
  date: string
  name: string
  amount: number
  type: 'income' | 'expense'
  category: string
  bank: string
}
