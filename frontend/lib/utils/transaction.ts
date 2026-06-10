import { Tables } from '@/lib/database.types'

/**
 * Formats a numeric amount to Indonesian Rupiah (IDR) currency format.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Filters an array of transactions based on a specified time range.
 */
export function filterTransactionsByRange(
  transactions: Tables<'transactions'>[],
  timeRange: string
): Tables<'transactions'>[] {
  return transactions.filter(tx => {
    const txDate = new Date(tx.date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - txDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (timeRange === "1W" && diffDays > 7) return false
    if (timeRange === "1M" && diffDays > 30) return false
    if (timeRange === "3M" && diffDays > 90) return false
    if (timeRange === "1Y" && diffDays > 365) return false
    
    return true
  })
}
