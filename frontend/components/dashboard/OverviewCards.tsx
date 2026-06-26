import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Banknote, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"
import { Tables } from "@/lib/database.types"
import { useMemo } from 'react'
import { formatCurrency } from "@/lib/utils/transaction"
import { cn } from "@/lib/utils"

export function OverviewCards({ transactions, timeRange }: { transactions: Tables<'cash_flow'>[], timeRange: string }) {
  // Data is already filtered by timeRange on the server
  const timeFilteredTransactions = transactions

  const { totalIncome, totalExpense } = useMemo(() => {
    const income = timeFilteredTransactions.reduce((acc, t) => acc + Number(t.income || 0), 0)
    const expense = timeFilteredTransactions.reduce((acc, t) => acc + Number(t.expense || 0), 0)
    return { totalIncome: income, totalExpense: expense }
  }, [timeFilteredTransactions])

  const netBalance = useMemo(() => {
    return totalIncome - totalExpense
  }, [totalIncome, totalExpense])

  const savingsRate = useMemo(() => {
    if (totalIncome <= 0) return 0
    return (netBalance / totalIncome) * 100
  }, [totalIncome, netBalance])

  const healthStatus = useMemo(() => {
    if (savingsRate >= 20) {
      return {
        text: 'Aman (Sehat)',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        dot: 'bg-emerald-500',
        borderColor: 'hover:border-emerald-200'
      }
    }
    if (savingsRate > 0) {
      return {
        text: 'Rentan',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        dot: 'bg-amber-500',
        borderColor: 'hover:border-amber-200'
      }
    }
    return {
      text: 'Bahaya (Defisit)',
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      dot: 'bg-rose-500',
      borderColor: 'hover:border-rose-200'
    }
  }, [savingsRate])

  return (
    <section aria-label="Ringkasan Keuangan" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Net Balance Card */}
      <Card className="bg-indigo-700 text-white shadow-lg border-transparent relative overflow-hidden rounded-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Banknote className="w-32 h-32" />
        </div>
        <CardHeader className="pb-4 relative z-10 break-words">
          <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-2">Net Balance</p>
          <CardTitle className="text-3xl xl:text-4xl font-bold tracking-tight">{formatCurrency(netBalance)}</CardTitle>
        </CardHeader>
      </Card>
      
      {/* Total Income Card */}
      <Card className="shadow-sm border border-slate-200 rounded-xl bg-white hover:border-emerald-200 transition-colors">
        <CardHeader className="pb-2 break-words">
          <CardDescription className="font-semibold flex items-center text-slate-500 text-xs tracking-wider uppercase mb-1">
            <TrendingUp className="w-4 h-4 mr-2 text-emerald-500"/> Total Income
          </CardDescription>
          <CardTitle className="text-2xl xl:text-3xl font-bold tracking-tight text-emerald-700">{formatCurrency(totalIncome)}</CardTitle>
        </CardHeader>
      </Card>
      
      {/* Total Expense Card */}
      <Card className="shadow-sm border border-slate-200 rounded-xl bg-white hover:border-rose-200 transition-colors">
        <CardHeader className="pb-2 break-words">
          <CardDescription className="font-semibold flex items-center text-slate-500 text-xs tracking-wider uppercase mb-1">
            <TrendingDown className="w-4 h-4 mr-2 text-rose-500"/> Total Expense
          </CardDescription>
          <CardTitle className="text-2xl xl:text-3xl font-bold tracking-tight text-rose-600">{formatCurrency(totalExpense)}</CardTitle>
        </CardHeader>
      </Card>

      {/* Savings Rate Card */}
      <Card className={cn("shadow-sm border border-slate-200 rounded-xl bg-white transition-colors", healthStatus.borderColor)}>
        <CardHeader className="pb-2 break-words">
          <CardDescription className="font-semibold flex items-center text-slate-500 text-xs tracking-wider uppercase mb-1">
            <PiggyBank className="w-4 h-4 mr-2 text-indigo-500"/> Rasio Tabungan
          </CardDescription>
          <div className="flex items-baseline gap-2 flex-wrap sm:flex-nowrap">
            <CardTitle className="text-2xl xl:text-3xl font-bold tracking-tight text-slate-800">
              {savingsRate.toFixed(1)}%
            </CardTitle>
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border shrink-0", healthStatus.color)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", healthStatus.dot)} />
              {healthStatus.text}
            </span>
          </div>
        </CardHeader>
      </Card>
    </section>
  )
}
