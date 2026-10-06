import Link from 'next/link'
import { Wallet, ArrowRight, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/transaction'
import type { CashWalletWithBalance } from '@/lib/repositories/types'

interface DashboardCashCardProps {
  wallets?: CashWalletWithBalance[] | null
}

export function DashboardCashCard({ wallets }: DashboardCashCardProps) {
  const list = wallets ?? []
  const totalBalance = list.reduce((sum, w) => sum + w.balance, 0)

  if (list.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-900 via-emerald-800 to-teal-900 p-6 text-white shadow-xl shadow-emerald-950/10 border-emerald-700/30">
        <div className="relative z-10 flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-100 border-emerald-400/30">
              <Wallet className="w-3.5 h-3.5" />
              <span>Uang Tunai</span>
            </div>
            <h3 className="text-lg font-bold tracking-tight text-white">Pantau Uang Cash Anda</h3>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              Catat uang tunai yang Anda pegang, di luar saldo bank. Tetapkan saldo awal dan lacak setiap pengeluaran tunai.
            </p>
          </div>
          <Link
            href="/cash-wallets"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-sm shadow-lg hover:bg-emerald-50 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Uang Cash</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-900 via-emerald-800 to-teal-900 p-6 text-white shadow-xl shadow-emerald-950/20 border-emerald-700/40">
      <div className="relative z-10 flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 border-emerald-500/30">
              <Wallet className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Uang Tunai (Cash)</span>
            <span className="text-xs text-emerald-300/70">· {list.length} Dompet</span>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-extrabold tracking-tight font-poppins">
              {formatCurrency(totalBalance)}
            </span>
          </div>
          <p className="text-xs text-emerald-100/80">Total saldo tunai di luar rekening bank</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap max-w-sm">
            {list.slice(0, 3).map((w) => (
              <div key={w.id} className="px-2.5 py-1 rounded-lg bg-white/5 border-white/10 text-xs backdrop-blur-sm">
                <span className="font-bold text-emerald-100">{w.name}</span>
                <span className="ml-1.5 text-emerald-200/70">{formatCurrency(w.balance)}</span>
              </div>
            ))}
          </div>
          <Link
            href="/cash-wallets"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <span>Kelola Dompet Tunai</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
