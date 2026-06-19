import { OCRResult, ReceiptItem, BankTransaction } from '@/lib/ocr/types'

export function isReceiptItem(item: ReceiptItem | BankTransaction): item is ReceiptItem {
  return 'name' in item && 'amount' in item && !('date' in item);
}

export function isBankTransaction(item: ReceiptItem | BankTransaction): item is BankTransaction {
  return 'date' in item && 'amount' in item;
}

export function mapReceiptResultToPayload(scanResult: OCRResult, fileToScan: File) {
  const receiptItems = scanResult.items
    ? (scanResult.items || []).filter(isReceiptItem)
    : []

  return {
    type: scanResult.type || 'shopping',
    storeName: scanResult.merchant || 'Unknown Merchant',
    storeAddress: scanResult.address || null,
    date: scanResult.date || new Date().toISOString(),
    totalPrice: scanResult.total || 0,
    paymentMethod: scanResult.paymentMethod || 'Cash',
    amountPaid: scanResult.amountPaid || scanResult.total || 0,
    change: scanResult.change || 0,
    atmId: scanResult.atmId || null,
    transactionType: scanResult.transactionType || null,
    fee: scanResult.fee || 0,
    bankStatementItemId: null,
    items: receiptItems.map(item => ({
      productName: item.name,
      quantity: item.quantity || 1,
      price: item.price || item.amount || 0,
    })),
    file: fileToScan,
  }
}

export function mapBankStatementResultToPayload(scanResult: OCRResult, fileToScan: File) {
  const bankTransactions = scanResult.items
    ? (scanResult.items || []).filter(isBankTransaction)
    : []

  return {
    bankName: scanResult.bank || 'Unknown Bank',
    statementPeriod: scanResult.statementPeriod || 'Unknown Period',
    openingBalance: scanResult.openingBalance,
    closingBalance: scanResult.closingBalance,
    items: bankTransactions,
    file: fileToScan
  }
}
