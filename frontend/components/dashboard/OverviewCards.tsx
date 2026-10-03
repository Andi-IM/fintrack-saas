import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Banknote, TrendingUp, TrendingDown, PiggyBank, ArrowLeftRight } from "lucide-react"
import { DashboardCashFlowEntry } from "@/lib/repositories/types"
import { useMemo } from 'react'
import { formatCurrency } from "@/lib/utils/transaction"
import { cn } from "@/lib/utils"
import { summarizeEntries, SAVINGS_TARGET_PERCENT, calculateTrend, type TrendIndicator } from "@/lib/utils/dashboard-summary"

function TrendBadge({ 
  trend, 
  invert = false,
  light = false,
}: { 
  trend: TrendIndicator | null
  invert?: boolean
  light?: boolean
}) {
  if (!trend || trend.direction === 'neutral') return null

  const isPositive = invert ? trend.direction === 'down' : trend.direction === 'up'
  const isUp = trend.direction === 'up'
  
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-semibold shrink-0",
      light 
        ? (isPositive ? "text-emerald-300" : "text-rose-300")
        : (isPositive ? "text-emerald-600" : "text-rose-600")
    )}>
      {isUp ? '↑' : '↓'} {trend.formatted} <span className={cn("text-[10px] font-normal", light ? "text-indigo-200" : "text-slate-400")}>vs lalu</span>
    </span>
  )
}

const STATUS_STYLES = {
  healthy: {
    text: 'Aman (Sehat)',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
    borderColor: 'hover:border-emerald-200',
    banner: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    bar: 'bg-emerald-500',
    icon: '✅',
  },
  vulnerable: {
    text: 'Rentan',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
    borderColor: 'hover:border-amber-200',
    banner: 'bg-amber-50 border-amber-200 text-amber-800',
    bar: 'bg-amber-500',
    icon: '⚠️',
  },
  deficit: {
    text: 'Bahaya (Defisit)',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    dot: 'bg-rose-500',
    borderColor: 'hover:border-rose-200',
    banner: 'bg-rose-50 border-rose-200 text-rose-800',
    bar: 'bg-rose-500',
    icon: '❌',
  },
} as const

export function OverviewCards({ 
  transactions,
  previousTransactions,
}: { 
  transactions: DashboardCashFlowEntry[]
  previousTransactions?: DashboardCashFlowEntry[]
}) {
  // Data is already filtered by timeRange on the server
  const summary = useMemo(() => summarizeEntries(transactions), [transactions])
  const previousSummary = useMemo(() => previousTransactions ? summarizeEntries(previousTransactions) : null, [previousTransactions])
  const { netBalance, realIncome, realExpense, transferIn, transferOut, savingsRate, realNet } = summary
  const healthStatus = STATUS_STYLES[summary.status]
  const hasTransfers = transferIn > 0 || transferOut > 0

  const netTrend = useMemo(() => {
    if (!previousSummary) return null
    return calculateTrend(summary.netBalance, previousSummary.netBalance)
  }, [summary.netBalance, previousSummary])

  const incomeTrend = useMemo(() => {
    if (!previousSummary) return null
    return calculateTrend(summary.realIncome, previousSummary.realIncome)
  }, [summary.realIncome, previousSummary])

  const expenseTrend = useMemo(() => {
    if (!previousSummary) return null
    return calculateTrend(summary.realExpense, previousSummary.realExpense)
  }, [summary.realExpense, previousSummary])

  const verdict = useMemo(() => {
    if (summary.status === 'deficit') {
      return `Periode ini: Defisit ${formatCurrency(Math.abs(realNet))} — butuh evaluasi`
    }
    if (summary.status === 'healthy') {
      return `Periode ini: Surplus sehat, tabungan ${savingsRate.toFixed(1)}% (target ${SAVINGS_TARGET_PERCENT}%)`
    }
    return `Periode ini: Surplus tipis, tabungan ${savingsRate.toFixed(1)}% (target ${SAVINGS_TARGET_PERCENT}%)`
  }, [summary.status, realNet, savingsRate])

  const barPercent = Math.min(Math.max(savingsRate, 0) / SAVINGS_TARGET_PERCENT * 100, 100)

  return (
    <div className="space-y-4">
    <div
      role="status"
      data-testid="health-banner"
      className={cn("flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold", healthStatus.banner)}
    >
      <span aria-hidden>{healthStatus.icon}</span>
      <span>{verdict}</span>
    </div>
    <section aria-label="Ringkasan Keuangan" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Net Balance Card */}
      <Card className="bg-indigo-700 text-white shadow-lg border-transparent relative overflow-hidden rounded-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Banknote className="w-32 h-32" />
        </div>
        <CardHeader className="pb-4 relative z-10 wrap-break-word">
          <div className="flex items-center justify-between gap-1 mb-2">
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Net Balance</p>
            <TrendBadge trend={netTrend} light />
          </div>
          <CardTitle className="text-3xl xl:text-4xl font-bold tracking-tight">{formatCurrency(netBalance)}</CardTitle>
        </CardHeader>
      </Card>
      
      {/* Total Income Card */}
      <Card className="shadow-sm border border-slate-200 rounded-xl bg-white hover:border-emerald-200 transition-colors">
        <CardHeader className="pb-2 wrap-break-word">
          <div className="flex items-center justify-between text-slate-500 text-xs tracking-wider uppercase mb-1">
            <span className="font-semibold flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-emerald-500"/> Pemasukan Riil
            </span>
            <TrendBadge trend={incomeTrend} />
          </div>
          <CardTitle className="text-2xl xl:text-3xl font-bold tracking-tight text-emerald-700">{formatCurrency(realIncome)}</CardTitle>
          {hasTransfers && (
            <p className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
              <ArrowLeftRight className="w-3 h-3" /> Pemindahan masuk: {formatCurrency(transferIn)}
            </p>
          )}
        </CardHeader>
      </Card>
      
      {/* Total Expense Card */}
      <Card className="shadow-sm border border-slate-200 rounded-xl bg-white hover:border-rose-200 transition-colors">
        <CardHeader className="pb-2 wrap-break-word">
          <div className="flex items-center justify-between text-slate-500 text-xs tracking-wider uppercase mb-1">
            <span className="font-semibold flex items-center">
              <TrendingDown className="w-4 h-4 mr-2 text-rose-500"/> Pengeluaran Riil
            </span>
            <TrendBadge trend={expenseTrend} invert />
          </div>
          <CardTitle className="text-2xl xl:text-3xl font-bold tracking-tight text-rose-600">{formatCurrency(realExpense)}</CardTitle>
          {hasTransfers && (
            <p className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
              <ArrowLeftRight className="w-3 h-3" /> Pemindahan dana: {formatCurrency(transferOut)}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Savings Rate Card */}
      <Card className={cn("shadow-sm border border-slate-200 rounded-xl bg-white transition-colors", healthStatus.borderColor)}>
        <CardHeader className="pb-2 wrap-break-word">
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
          <div className="mt-2" aria-label={`Rasio tabungan ${savingsRate.toFixed(1)} persen dari target ${SAVINGS_TARGET_PERCENT} persen`}>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div className={cn("h-1.5 rounded-full", healthStatus.bar)} style={{ width: `${barPercent}%` }} />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Target minimal {SAVINGS_TARGET_PERCENT}% (aturan 50/30/20)</p>
          </div>
        </CardHeader>
      </Card>
    </section>
    </div>
  )
}
