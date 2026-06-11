'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStatementAnalytics } from '@/lib/actions/statements'
import type {
  StatementAnalytics as StatementAnalyticsData,
  DailyBalancePoint,
  BankAnalyticsSummary,
} from '@/lib/actions/statements'
import { Card, CardContent } from '@/components/ui/card'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
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

const RANGE_OPTIONS = ['1M', '3M', '6M', '1Y', 'ALL'] as const
type TimeRange = typeof RANGE_OPTIONS[number]

interface ChartDataRow {
  date: string
  [bankName: string]: string | number | null
}

function getChartDataByRange(
  history: DailyBalancePoint[],
  bankSummaries: BankAnalyticsSummary[],
  range: TimeRange
) {
  const allBanks = [...new Set(history.map(h => h.bankName))]
  const txDates = [...new Set(history.map(h => h.date))].sort()
  
  const bankOpeningBalances = new Map<string, number>()
  bankSummaries.forEach(s => {
    bankOpeningBalances.set(s.bankName, s.openingBalance)
  })

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  let cutoffStr: string | null = null
  if (range !== 'ALL') {
    const ms = {
      '1M': 30 * 24 * 60 * 60 * 1000,
      '3M': 90 * 24 * 60 * 60 * 1000,
      '6M': 180 * 24 * 60 * 60 * 1000,
      '1Y': 365 * 24 * 60 * 60 * 1000,
    }[range]
    cutoffStr = new Date(now.getTime() - ms).toISOString().slice(0, 10)
  }

  let datesToShow = txDates
  if (cutoffStr) {
    datesToShow = txDates.filter(d => d >= cutoffStr)
    if (!datesToShow.includes(cutoffStr)) {
      datesToShow.unshift(cutoffStr)
    }
  }
  if (!datesToShow.includes(todayStr)) {
    datesToShow.push(todayStr)
  }
  if (datesToShow.length < 2) {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    if (!datesToShow.includes(yesterday)) {
      datesToShow.unshift(yesterday)
    }
  }
  datesToShow.sort()

  const bankTimelines: Record<string, DailyBalancePoint[]> = {}
  allBanks.forEach(b => {
    bankTimelines[b] = history.filter(h => h.bankName === b)
  })

  const txMap = new Map<string, DailyBalancePoint['transactions']>()

  const chartData: ChartDataRow[] = datesToShow.map(date => {
    const entry: ChartDataRow = { date }
    allBanks.forEach(bank => {
      const timeline = bankTimelines[bank]
      const point = [...timeline].reverse().find(p => p.date <= date)
      const opening = bankOpeningBalances.get(bank) ?? 0
      entry[bank] = point?.balance ?? opening
      
      if (point) {
        const match = timeline.find(p => p.date === date && p.bankName === bank)
        if (match) {
          txMap.set(`${date}|${bank}`, match.transactions)
        }
      }
    })
    return entry
  })

  return { chartData, banks: allBanks, txLookup: txMap }
}

function BalanceChart({ data }: { data: StatementAnalyticsData }) {
  const [range, setRange] = useState<TimeRange>('1Y')
  const [visibleBanks, setVisibleBanks] = useState<Set<string>>(() =>
    new Set(data.balanceHistory.map(h => h.bankName))
  )

  const { chartData, banks, txLookup } = useMemo(
    () => getChartDataByRange(data.balanceHistory, data.bankSummaries, range),
    [data.balanceHistory, data.bankSummaries, range]
  )

  const toggleBank = useCallback((bank: string) => {
    setVisibleBanks(prev => {
      const next = new Set(prev)
      if (next.has(bank)) next.delete(bank)
      else next.add(bank)
      return next
    })
  }, [])

  const handleLegendClick = useCallback((e: { value?: string }) => {
    if (e.value) toggleBank(e.value)
  }, [toggleBank])

  const CustomTooltip = useCallback(({ active, payload, label }: {
    active?: boolean; payload?: { dataKey: string; value: number; name: string }[]; label?: string
  }) => {
    if (!active || !payload || !label) return null
    const dateStr = new Date(label).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-lg p-3 text-xs max-w-[260px]">
        <p className="font-bold text-slate-700 mb-2">{dateStr}</p>
        {payload.filter(p => p.value != null && visibleBanks.has(p.name)).map(p => {
          const txs = txLookup.get(`${label}|${p.name}`)
          return (
            <div key={p.name} className="mb-1.5 last:mb-0">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: getBankColor(p.name) }} />
                {p.name}
                <span className="ml-auto font-mono">{formatCurrency(p.value)}</span>
              </div>
              {txs && txs.length > 0 && (
                <div className="space-y-0.5 pl-3.5">
                  {txs.map((tx, i) => (
                    <div key={i} className="flex justify-between gap-2 text-[11px]">
                      <span className="text-slate-500 truncate">{tx.description}</span>
                      <span className={tx.type === 'income' ? 'text-emerald-600 font-mono shrink-0' : 'text-rose-600 font-mono shrink-0'}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {payload.filter(p => p.value != null && visibleBanks.has(p.name)).length === 0 && (
          <p className="text-slate-400 italic">No data</p>
        )}
      </div>
    )
  }, [txLookup, visibleBanks])

  if (chartData.length < 2) return null

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl bg-white">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-indigo-500" />
            Balance History
          </h3>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {RANGE_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={[
                  'px-3 py-1 rounded-md text-[10px] font-bold transition-all',
                  range === r
                    ? 'bg-white shadow-sm text-indigo-700'
                    : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(val: string) => {
                  const d = new Date(val)
                  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val: number) => formatCurrency(val)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                onClick={handleLegendClick}
                wrapperStyle={{ fontSize: '11px', cursor: 'pointer', paddingTop: '8px' }}
              />
              {banks.map(bank => (
                <Line
                  key={bank}
                  type="stepAfter"
                  dataKey={bank}
                  name={bank}
                  stroke={getBankColor(bank)}
                  strokeWidth={visibleBanks.has(bank) ? 2.5 : 0}
                  strokeOpacity={1}
                  dot={false}
                  activeDot={{ r: 4, fill: getBankColor(bank), strokeWidth: 0 }}
                  connectNulls={false}
                  hide={!visibleBanks.has(bank)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function TotalSaldoChart({ data }: { data: StatementAnalyticsData }) {
  const [range, setRange] = useState<TimeRange>('1Y')

  const chartData = useMemo(() => {
    const { chartData: baseData, banks } = getChartDataByRange(data.balanceHistory, data.bankSummaries, range)
    return baseData.map(row => {
      let sum = 0
      banks.forEach(bank => {
        sum += (row[bank] as number) ?? 0
      })
      return {
        date: row.date.slice(0, 10),
        total: sum
      }
    })
  }, [data.balanceHistory, data.bankSummaries, range])

  if (chartData.length < 2) return null

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl bg-white">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-500" />
            Total Saldo
          </h3>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {RANGE_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={[
                  'px-3 py-1 rounded-md text-[10px] font-bold transition-all',
                  range === r
                    ? 'bg-white shadow-sm text-indigo-700'
                    : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="total-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(val: string) => {
                  const d = new Date(val)
                  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
                }}
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
                labelFormatter={(label) => {
                  const d = new Date(label as string)
                  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
                }}
                formatter={(value: unknown) =>
                  value !== undefined && value !== null
                    ? formatCurrency(Number(value))
                    : '-'
                }
              />
              <Area
                type="stepAfter"
                dataKey="total"
                name="Total Saldo"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#total-gradient)"
              />
            </AreaChart>
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
      <TotalSaldoChart data={analytics} />
      <BankSummaryGrid data={analytics} />
    </div>
  )
}
