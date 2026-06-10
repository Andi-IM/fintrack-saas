import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Banknote, TrendingUp, TrendingDown } from "lucide-react"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)
}

export function OverviewCards({ transactions, timeRange }: { transactions: any[], timeRange: string }) {
  const timeFilteredTransactions = transactions.filter(tx => {
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

  const totalIncome = timeFilteredTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0)
  const totalExpense = timeFilteredTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0)
  const netBalance = totalIncome - totalExpense

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
