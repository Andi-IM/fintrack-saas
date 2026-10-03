'use client'

import { useState, useMemo, useSyncExternalStore } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { TrendingUp, ShieldCheck, Activity } from "lucide-react"
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryState } from 'nuqs'
import { DashboardCashFlowEntry } from "@/lib/repositories/types"
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/transaction'
import { summarizeEntries } from '@/lib/utils/dashboard-summary'

export function TransactionChart({ transactions }: { transactions: DashboardCashFlowEntry[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [chartView, setChartView] = useState<'balance' | 'flow'>('balance')

  // false during SSR/hydration, true on the client afterwards
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const [range, setRange] = useQueryState('range', {
    defaultValue: '1M',
    shallow: false,
  })

  const handleRangeChange = (newRange: string) => {
    setRange(newRange)
  }

  const summary = useMemo(() => summarizeEntries(transactions), [transactions])
  const targetSurplus = useMemo(() => Math.round(summary.realIncome * 0.20), [summary.realIncome])

  const chartData = useMemo(() => {
    const chartDataMap = transactions.reduce((acc, tx) => {
      const dateKey = tx.date.split('T')[0]
      if (!acc[dateKey]) acc[dateKey] = { date: dateKey, income: 0, expense: 0 }
      acc[dateKey].income += Number(tx.income || 0)
      acc[dateKey].expense += Number(tx.expense || 0)
      return acc
    }, {} as Record<string, { date: string; income: number; expense: number }>)

    const sorted = (Object.values(chartDataMap) as Array<{ date: string; income: number; expense: number }>)
      .sort((a, b) => a.date.localeCompare(b.date))

    const result: Array<{ date: string; income: number; expense: number; balance: number }> = []
    let currentBalance = 0
    for (const item of sorted) {
      currentBalance += (item.income - item.expense)
      result.push({
        ...item,
        balance: currentBalance,
      })
    }
    return result
  }, [transactions])

  const handleChartClick = (data: unknown) => {
    const chartData = data as { activePayload?: { payload: { date: string } }[] } | null | undefined
    if (chartData && chartData.activePayload && chartData.activePayload.length > 0) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('date', chartData.activePayload[0].payload.date)
      router.push(`/transactions?${params.toString()}`)
    }
  }

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl bg-white">
      <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 pt-4 px-6">
        <div className="flex items-center gap-3 flex-wrap">
          <CardTitle className="text-sm font-bold text-slate-800">Financial Overview</CardTitle>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setChartView('balance')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1",
                chartView === 'balance' ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Zona Saldo
            </button>
            <button
              onClick={() => setChartView('flow')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1",
                chartView === 'flow' ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Activity className="w-3 h-3 text-indigo-500" />
              Arus Kas
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 justify-end">
          {['TODAY', '1W', 'MTD', '1M', '3M', 'YTD', '1Y'].map(r => (
            <button 
              key={r} 
              onClick={() => handleRangeChange(r)}
              className={cn("px-2 py-1 rounded-md text-[10px] font-bold transition-all", range === r ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-800')}
            >
              {r}
            </button>
          ))}
        </div>
      </CardHeader>

      {/* Safety zone indicator pill */}
      {chartView === 'balance' && chartData.length > 0 && (
        <div className="px-6 pt-3 flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-50 pb-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <span className="w-2.5 h-0.5 bg-emerald-500 rounded inline-block" />
              Garis Hijau: Target Aman ({targetSurplus > 0 ? formatCurrency(targetSurplus) : '20%'})
            </span>
            <span className="flex items-center gap-1 text-rose-600 font-medium">
              <span className="w-2.5 h-0.5 bg-rose-500 rounded inline-block" />
              Garis Merah: Batas Impas / Defisit (Rp 0)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 hidden md:inline">Klik titik grafik untuk filter transaksi</span>
        </div>
      )}

      <CardContent className="h-80 pt-4 px-2">
        {isMounted && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={chartData} margin={{ top: 15, right: 25, left: 15, bottom: 0 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} width={85} tickFormatter={(val) => formatCurrency(val).replace(",00", "")} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: unknown, name?: unknown) => {
                  if (value === undefined || value === null) return ''
                  const label = name === 'balance' ? 'Saldo Berjalan' : name === 'income' ? 'Pemasukan' : 'Pengeluaran'
                  return [formatCurrency(Number(value)), label]
                }}
              />

              {chartView === 'balance' ? (
                <>
                  {targetSurplus > 0 && (
                    <ReferenceLine 
                      y={targetSurplus} 
                      stroke="#10b981" 
                      strokeDasharray="4 4" 
                      strokeWidth={1.5}
                    />
                  )}
                  <ReferenceLine 
                    y={0} 
                    stroke="#f43f5e" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    name="balance" 
                    stroke="#6366f1" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorBalance)" 
                  />
                </>
              ) : (
                <>
                  <Area type="monotone" dataKey="income" name="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" name="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-4">
            <div className="bg-slate-100 p-4 rounded-full">
              <TrendingUp className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <p className="font-bold text-slate-600">No financial data yet</p>
              <p className="text-sm max-w-60 mt-1">Start by adding a manual transaction or scanning a receipt.</p>
            </div>
            <Link href="/add" className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-9 px-4">
              Add Transaction
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
