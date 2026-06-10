'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStatementAnalytics } from '@/lib/actions/statements'
import type { StatementAnalytics as StatementAnalyticsData } from '@/lib/actions/statements'
import { Card, CardContent } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Wallet, TrendingUp, TrendingDown, Building2, Loader2, Landmark,
} from 'lucide-react'

const BANK_COLORS: Record<string, string> = {
  'BNI': '#6366f1',
  'Bank JAGO': '#10b981',
  'SeaBank': '#f59e0b',
  'BSI': '#8b5cf6',
}

function getBankColor(bankName: string): string {
  return BANK_COLORS[bankName] || '#64748b'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function OverviewCards({ data }: { data: StatementAnalyticsData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-indigo-700 text-white shadow-lg border-transparent relative overflow-hidden rounded-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Wallet className="w-24 h-24" />
        </div>
        <CardContent className="p-5 relative z-10">
          <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-1">
            Total Net Worth
          </p>
          <p className="text-2xl xl:text-3xl font-bold tracking-tight">
            {formatCurrency(data.netWorth)}
          </p>
          <p className="text-indigo-200 text-xs mt-1">
            Across {data.bankSummaries.length} bank{data.bankSummaries.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-slate-200 rounded-xl bg-white hover:border-emerald-200 transition-colors">
        <CardContent className="p-5">
          <p className="font-semibold flex items-center text-slate-500 text-xs tracking-wider uppercase mb-1">
            <TrendingUp className="w-4 h-4 mr-2 text-emerald-500" />
            Total Income
          </p>
          <p className="text-2xl xl:text-3xl font-bold tracking-tight text-emerald-600">
            {formatCurrency(data.totalIncome)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            From all bank statement items
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-slate-200 rounded-xl bg-white hover:border-rose-200 transition-colors">
        <CardContent className="p-5">
          <p className="font-semibold flex items-center text-slate-500 text-xs tracking-wider uppercase mb-1">
            <TrendingDown className="w-4 h-4 mr-2 text-rose-500" />
            Total Expense
          </p>
          <p className="text-2xl xl:text-3xl font-bold tracking-tight text-rose-600">
            {formatCurrency(data.totalExpense)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            From all bank statement items
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function BalanceChart({ data }: { data: StatementAnalyticsData }) {
  const chartData = useMemo(() => {
    const banks = [...new Set(data.balanceHistory.map(h => h.bankName))]
    const periodMap = new Map<string, Record<string, number | null>>()

    data.balanceHistory.forEach(h => {
      if (!periodMap.has(h.period)) {
        periodMap.set(h.period, {})
      }
      periodMap.get(h.period)![h.bankName] = h.closingBalance
    })

    const sortedKeys = [...periodMap.keys()].sort((a, b) => {
      const ha = data.balanceHistory.find(h => h.period === a)
      const hb = data.balanceHistory.find(h => h.period === b)
      return (ha?.sortKey ?? 0) - (hb?.sortKey ?? 0)
    })

    return sortedKeys.map(period => {
      const entry: Record<string, string | number | null> = { period }
      banks.forEach(bank => {
        const val = periodMap.get(period)?.[bank]
        entry[bank] = val ?? null
      })
      return entry
    })
  }, [data.balanceHistory])

  if (chartData.length < 2) return null

  const banks = [...new Set(data.balanceHistory.map(h => h.bankName))]

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl bg-white">
      <CardContent className="p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-indigo-500" />
          Balance History
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val: number) => formatCurrency(val)}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value: unknown) =>
                  value !== undefined && value !== null
                    ? formatCurrency(Number(value))
                    : '-'
                }
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />
              {banks.map(bank => (
                <Bar
                  key={bank}
                  dataKey={bank}
                  name={bank}
                  fill={getBankColor(bank)}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function BankSummaryGrid({ data }: { data: StatementAnalyticsData }) {
  if (data.bankSummaries.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {data.bankSummaries.map(bank => (
        <Card
          key={bank.bankName}
          className="shadow-sm border-slate-200 rounded-xl bg-white hover:shadow-md transition-shadow"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="p-1.5 rounded-lg"
                style={{ backgroundColor: `${getBankColor(bank.bankName)}15` }}
              >
                <Building2
                  className="w-4 h-4"
                  style={{ color: getBankColor(bank.bankName) }}
                />
              </div>
              <span className="text-sm font-bold text-slate-800">{bank.bankName}</span>
            </div>
            <p className="text-lg font-bold text-slate-900 font-mono">
              {formatCurrency(bank.latestBalance)}
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium">
                {bank.statementsCount} statement{bank.statementsCount !== 1 ? 's' : ''}
              </span>
              {bank.latestPeriod && (
                <span className="text-[10px] text-indigo-500 font-semibold truncate ml-2">
                  {bank.latestPeriod}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function StatementAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['bank-statement-analytics'],
    queryFn: async () => {
      const result = await getStatementAnalytics()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!analytics || analytics.bankSummaries.length === 0) {
    return null
  }

  return (
    <div className="space-y-5">
      <OverviewCards data={analytics} />
      <BalanceChart data={analytics} />
      <BankSummaryGrid data={analytics} />
    </div>
  )
}
