import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Banknote, TrendingUp, TrendingDown } from "lucide-react"
import { Tables } from "@/lib/database.types"
import { useMemo } from 'react'
import { formatCurrency, filterTransactionsByRange } from "@/lib/utils/transaction"

export function OverviewCards({ transactions, timeRange }: { transactions: Tables<'transactions'>[], timeRange: string }) {
  const timeFilteredTransactions = useMemo(() => {
    return filterTransactionsByRange(transactions, timeRange)
  }, [transactions, timeRange])

  const { totalIncome, totalExpense } = useMemo(() => {
    const income = timeFilteredTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0)
    const expense = timeFilteredTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0)
    return { totalIncome: income, totalExpense: expense }
  }, [timeFilteredTransactions])

  const netBalance = useMemo(() => {
    return totalIncome - totalExpense
  }, [totalIncome, totalExpense])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-indigo-700 text-white shadow-lg border-transparent relative overflow-hidden rounded-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Banknote className="w-32 h-32" />
        </div>
        <CardHeader className="pb-4 relative z-10 break-words">
          <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-2">Net Balance</p>
          <CardTitle className="text-3xl xl:text-4xl font-bold tracking-tight">{formatCurrency(netBalance)}</CardTitle>
        </CardHeader>
      </Card>
      
      <Card className="shadow-sm border border-slate-200 rounded-xl bg-white hover:border-emerald-200 transition-colors">
        <CardHeader className="pb-2 break-words">
          <CardDescription className="font-semibold flex items-center text-slate-500 text-xs tracking-wider uppercase mb-1">
            <TrendingUp className="w-4 h-4 mr-2 text-emerald-500"/> Total Income
          </CardDescription>
          <CardTitle className="text-2xl xl:text-3xl font-bold tracking-tight text-emerald-600">{formatCurrency(totalIncome)}</CardTitle>
        </CardHeader>
      </Card>
      
      <Card className="shadow-sm border border-slate-200 rounded-xl bg-white hover:border-rose-200 transition-colors">
        <CardHeader className="pb-2 break-words">
          <CardDescription className="font-semibold flex items-center text-slate-500 text-xs tracking-wider uppercase mb-1">
            <TrendingDown className="w-4 h-4 mr-2 text-rose-500"/> Total Expense
          </CardDescription>
          <CardTitle className="text-2xl xl:text-3xl font-bold tracking-tight text-rose-600">{formatCurrency(totalExpense)}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}
