'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)
}

export function TransactionChart({ transactions, timeRange: initialRange }: { transactions: any[], timeRange: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleRangeChange = (range: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', range)
    router.push(`${pathname}?${params.toString()}`)
  }

  const timeFilteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - txDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (initialRange === "1W" && diffDays > 7) return false
    if (initialRange === "1M" && diffDays > 30) return false
    if (initialRange === "3M" && diffDays > 90) return false
    if (initialRange === "1Y" && diffDays > 365) return false
    
    return true
  })

  const chartDataMap = timeFilteredTransactions.reduce((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = { date: tx.date, income: 0, expense: 0 }
    if (tx.type === "income") acc[tx.date].income += tx.amount
    else acc[tx.date].expense += tx.amount
    return acc
  }, {} as Record<string, {date: string, income: number, expense: number}>)
  
  const chartData = (Object.values(chartDataMap) as Array<{date: string, income: number, expense: number}>).sort((a, b) => a.date.localeCompare(b.date))

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('date', data.activePayload[0].payload.date)
      router.push(`/transactions?${params.toString()}`)
    }
  }

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl bg-white">
      <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-3 pt-4 px-6">
        <CardTitle className="text-sm font-bold text-slate-800">Financial Overview</CardTitle>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {['1W', '1M', '3M', '1Y'].map(range => (
            <button key={range} onClick={() => handleRangeChange(range)} className={["px-3 py-1 rounded-md text-[10px] font-bold transition-all", initialRange === range ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'].join(" ")}>
              {range}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="h-[320px] pt-4 px-2">
        {isMounted && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
              <defs>
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
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dx={-10} tickFormatter={(val) => formatCurrency(val).replace(",00", "")} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => formatCurrency(Number(value))}
              />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
              <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-4">
            <div className="bg-slate-100 p-4 rounded-full">
              <TrendingUp className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <p className="font-bold text-slate-600">No financial data yet</p>
              <p className="text-sm max-w-[240px] mt-1">Start by adding a manual transaction or scanning a receipt.</p>
            </div>
            <a href="/add" className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold h-9 px-4">
              Add Transaction
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
