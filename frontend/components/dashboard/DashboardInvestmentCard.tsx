import Link from 'next/link'
import { TrendingUp, TrendingDown, ArrowRight, Wallet, PieChart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/transaction'
import type { InvestmentOverviewResponse } from '@/features/investments/actions/investments'

interface DashboardInvestmentCardProps {
  overview?: InvestmentOverviewResponse | null
}

export function DashboardInvestmentCard({ overview }: DashboardInvestmentCardProps) {
  const hasAccounts = overview && overview.accounts && overview.accounts.length > 0
  const isPositive = (overview?.totalGainLoss ?? 0) >= 0
  const isDayPositive = (overview?.dayChange ?? 0) >= 0

  if (!hasAccounts) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-900 via-indigo-800 to-purple-900 p-6 text-white shadow-xl shadow-indigo-950/10 border border-indigo-700/30">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 backdrop-blur-sm">
              <PieChart className="w-3.5 h-3.5 text-indigo-300" />
              <span>Fitur Baru FinTrack</span>
            </div>
            <h3 className="text-lg font-bold tracking-tight text-white">Portofolio Investasi Mandiri</h3>
            <p className="text-sm text-indigo-200/90 leading-relaxed">
              Catat dan pantau aset saham (IDX), reksa dana, kripto, dan emas dalam satu dashboard terintegrasi tanpa popup yang mengganggu.
            </p>
          </div>
          <Link
            href="/investments"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-sm shadow-lg shadow-black/10 hover:bg-indigo-50 transition-all active:scale-95 shrink-0"
          >
            <span>Buka Investasi</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const { totalValue, totalGainLoss, totalGainLossPct, dayChange, dayChangePct, accounts, topHoldings } = overview

  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl shadow-indigo-950/20 border border-indigo-800/40">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Column: Heading & Value */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Wallet className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Portofolio Investasi</span>
            <span className="text-xs text-slate-400">· {accounts.length} Akun Terhubung</span>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-extrabold tracking-tight font-poppins">
              {formatCurrency(totalValue)}
            </span>
            <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPositive 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{isPositive ? '+' : ''}{totalGainLossPct.toFixed(2)}% ({formatCurrency(totalGainLoss)})</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 flex items-center gap-2">
            <span>Perubahan hari ini:</span>
            <span className={isDayPositive ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {isDayPositive ? '+' : ''}{formatCurrency(dayChange)} ({isDayPositive ? '+' : ''}{dayChangePct.toFixed(2)}%)
            </span>
          </p>
        </div>

        {/* Right Column: Top Holdings Preview & CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6">
          {topHoldings && topHoldings.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap max-w-sm">
              {topHoldings.slice(0, 3).map((h) => (
                <div 
                  key={h.id}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs backdrop-blur-sm"
                >
                  <span className="font-bold text-slate-200">{h.symbol}</span>
                  <span className="ml-1.5 text-slate-400">{formatCurrency(h.marketValue)}</span>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/investments"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <span>Buka Fitur Investasi</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
