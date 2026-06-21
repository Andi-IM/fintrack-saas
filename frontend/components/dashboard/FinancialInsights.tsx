'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  PiggyBank,
  Wallet,
  ArrowRight,
  ShieldAlert,
  Info
} from "lucide-react"
import { Tables } from "@/lib/database.types"
import { formatCurrency } from "@/lib/utils/transaction"
import { cn } from "@/lib/utils"

function formatMonthName(monthStr: string) {
  if (!monthStr) return ''
  const [year, month] = monthStr.split('-')
  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const mIndex = parseInt(month, 10) - 1
  return `${monthsIndo[mIndex]} ${year}`
}

export function FinancialInsights({ transactions }: { transactions: Tables<'cash_flow'>[] }) {
  const [activeTab, setActiveTab] = useState<'summary' | 'leak' | 'recommendations'>('summary')
  const [completedRecommendations, setCompletedRecommendations] = useState<Record<string, boolean>>({})

  // Load checklist state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fintrack_advisor_checklist')
    if (saved) {
      try {
        setCompletedRecommendations(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const toggleRecommendation = (id: string) => {
    const updated = {
      ...completedRecommendations,
      [id]: !completedRecommendations[id]
    }
    setCompletedRecommendations(updated)
    localStorage.setItem('fintrack_advisor_checklist', JSON.stringify(updated))
  }

  // Monthly summary aggregation
  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expense: number; net: number }> = {}
    transactions.forEach(t => {
      const month = t.date.substring(0, 7) // YYYY-MM
      if (!months[month]) {
        months[month] = { income: 0, expense: 0, net: 0 }
      }
      months[month].income += Number(t.income || 0)
      months[month].expense += Number(t.expense || 0)
      months[month].net = months[month].income - months[month].expense
    })
    return months
  }, [transactions])

  // Key monthly stats
  const { peakMonth, peakNet, worstMonth, worstNet, deficitMonths } = useMemo(() => {
    let peakM = ''
    let peakN = -Infinity
    let worstM = ''
    let worstN = Infinity
    const deficits: { month: string; income: number; expense: number; net: number }[] = []

    Object.entries(monthlyData).forEach(([month, data]) => {
      if (data.net > peakN) {
        peakN = data.net
        peakM = month
      }
      if (data.net < worstN) {
        worstN = data.net
        worstM = month
      }
      if (data.net < 0) {
        deficits.push({ month, ...data })
      }
    })

    // Sort deficits by net ascending (worst first, i.e., most negative net first)
    deficits.sort((a, b) => a.net - b.net)

    return { 
      peakMonth: peakM, 
      peakNet: peakN === -Infinity ? 0 : peakN,
      worstMonth: worstM, 
      worstNet: worstN === Infinity ? 0 : worstN,
      deficitMonths: deficits 
    }
  }, [monthlyData])

  // Top 5 Expenses
  const topExpenses = useMemo(() => {
    return [...transactions]
      .filter(t => Number(t.expense || 0) > 0)
      .sort((a, b) => Number(b.expense || 0) - Number(a.expense || 0))
      .slice(0, 5)
  }, [transactions])

  // Needs Category Ratio
  const needsStats = useMemo(() => {
    const totalExp = transactions.reduce((acc, t) => acc + Number(t.expense || 0), 0)
    const needsExp = transactions
      .filter(t => t.main_category === 'Needs' || t.main_category === 'Kebutuhan (Needs)')
      .reduce((acc, t) => acc + Number(t.expense || 0), 0)
    return {
      ratio: totalExp > 0 ? (needsExp / totalExp) * 100 : 0,
      totalExp,
      needsExp
    }
  }, [transactions])

  // Receipts change collected
  const changeStats = useMemo(() => {
    const changeTx = transactions.filter(t => 
      t.description?.toLowerCase().includes('kembalian') && Number(t.income || 0) > 0
    )
    const total = changeTx.reduce((acc, t) => acc + Number(t.income || 0), 0)
    return {
      count: changeTx.length,
      total
    }
  }, [transactions])

  const overallNet = useMemo(() => {
    const totalInc = transactions.reduce((acc, t) => acc + Number(t.income || 0), 0)
    return totalInc - needsStats.totalExp
  }, [transactions, needsStats])

  return (
    <Card className="shadow-md border-slate-200 rounded-xl bg-white overflow-hidden mt-6">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-indigo-50/80 via-indigo-50/30 to-white border-b border-slate-100 py-5 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm shadow-indigo-200">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-800">AI Financial Insights & Recommendations</CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium mt-0.5">
                Analisis keuangan mendalam dan panduan taktis dari konsultan finansial Anda
              </CardDescription>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
            📊 Data Terupdate
          </span>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-1.5 mt-5 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60 max-w-md">
          <button 
            onClick={() => setActiveTab('summary')}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === 'summary' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Ringkasan Analisis
          </button>
          <button 
            onClick={() => setActiveTab('leak')}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === 'leak' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Wallet className="w-3.5 h-3.5" />
            Kebocoran Kas
          </button>
          <button 
            onClick={() => setActiveTab('recommendations')}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === 'recommendations' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Rekomendasi Aksi
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Tab 1: Ringkasan Analisis */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Volatility Indicator Card */}
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-2">
                    <TrendingUp className="w-4 h-4" /> Volatilitas Bulanan
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Arus kas bulanan Anda menunjukkan volatilitas pendapatan yang tinggi. Hal ini wajar bagi pemilik bisnis/freelancer, namun membutuhkan cadangan likuiditas yang kuat.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Puncak Surplus ({formatMonthName(peakMonth)})</span>
                  <span className="font-bold text-emerald-700">+{formatCurrency(peakNet)}</span>
                </div>
              </div>

              {/* Deficit Alert Card */}
              <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-2">
                    <AlertTriangle className="w-4 h-4" /> Risiko Defisit
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Pengeluaran cenderung tidak elastis (sulit ditekan) saat pendapatan anjlok. Anda mengalami defisit di beberapa bulan paceklik.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Defisit Terparah ({formatMonthName(worstMonth)})</span>
                  <span className="font-bold text-rose-600">{formatCurrency(worstNet)}</span>
                </div>
              </div>
            </div>

            {/* Deficit Months List */}
            {deficitMonths.length > 0 && (
              <div className="border border-slate-100 rounded-xl p-4 bg-white">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" /> Riwayat Bulan Defisit
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {deficitMonths.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/30 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{formatMonthName(item.month)}</p>
                        <p className="text-[10px] text-slate-500">Pendapatan: {formatCurrency(item.income)}</p>
                      </div>
                      <span className="font-bold text-rose-500">{formatCurrency(item.net)}</span>
                    </div>
                  ))}
                  {deficitMonths.length > 3 && (
                    <div className="p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/10 flex items-center justify-center text-xs text-slate-500 font-semibold italic">
                      + {deficitMonths.length - 3} bulan defisit lainnya
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Kebocoran Kas */}
        {activeTab === 'leak' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Change/Kembalian Indicator */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-xl text-emerald-700 shrink-0">
                  <PiggyBank className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Kembalian Resit Diselamatkan</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{formatCurrency(changeStats.total)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Anda berhasil mencatat <span className="font-bold text-emerald-700">{changeStats.count} kali</span> kembalian belanja mikro. Ini mencegah kebocoran uang kecil!
                  </p>
                </div>
              </div>

              {/* Needs Ratio Chart/Visual */}
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rasio Kategori Kebutuhan</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-xl font-bold text-slate-800">{needsStats.ratio.toFixed(1)}%</p>
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">⚠️ Terlalu Tinggi</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Pengeluaran terlabel &quot;Needs&quot; mendominasi. Kemungkinan besar banyak tarik tunai ATM yang sebenarnya digunakan untuk keinginan (*wants*).
                  </p>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3">
                  <div 
                    className="bg-indigo-600 h-1.5 rounded-full" 
                    style={{ width: `${Math.min(needsStats.ratio, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Top 5 Expenses List */}
            <div className="border border-slate-100 rounded-xl p-4 bg-white">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-500" /> 5 Transaksi Pengeluaran Terbesar
              </h4>
              <div className="divide-y divide-slate-100">
                {topExpenses.map((t, idx) => (
                  <div key={t.id || idx} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800 line-clamp-1">{t.description || 'Pengeluaran tanpa deskripsi'}</p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • {t.payment_method || 'Tunai'}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-rose-600">-{formatCurrency(Number(t.expense))}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 italic mt-3 bg-slate-50 p-2 rounded-lg leading-relaxed">
                *Tarik Tunai besar tanpa rincian sering menjadi &quot;Cash Leak&quot;. Disarankan mencatat kembali subkategori penggunaan dana setelah ditarik.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Rekomendasi Aksi */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-semibold mb-2">
              Beri tanda centang pada rekomendasi yang telah atau sedang Anda lakukan:
            </p>

            {/* Checklist items */}
            {[
              {
                id: 'emergency_fund',
                title: 'Bangun Dana Darurat (Emergency Fund)',
                badge: 'Prioritas Utama',
                badgeColor: 'bg-rose-50 text-rose-700 border-rose-100',
                desc: 'Target minimal Rp 3.000.000 (sekitar 6x pengeluaran bulanan rata-rata Rp 500rb). Simpan di rekening terpisah (seperti Kantong Bank Jago atau SeaBank) agar tidak tercampur.'
              },
              {
                id: 'audit_needs',
                title: 'Audit Klasifikasi Kategori "Needs"',
                badge: 'Evaluasi Anggaran',
                badgeColor: 'bg-amber-50 text-amber-700 border-amber-100',
                desc: `Rasio Kebutuhan Anda saat ini mencapai ${needsStats.ratio.toFixed(1)}%. Lakukan pemisahan ketat antara Kebutuhan Pokok (Needs - 50%), Keinginan (Wants - 30%), dan Tabungan langsung di awal bulan (20%).`
              },
              {
                id: 'salary_yourself',
                title: 'Implementasi Strategi "Gaji Diri Sendiri"',
                badge: 'Manajemen Volatilitas',
                badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                desc: `Untuk mengatasi fluktuasi pendapatan bulanan (Puncak: ${formatMonthName(peakMonth)}, Paceklik: ${formatMonthName(worstMonth)}), simpan surplus di bulan puncak dan cairkan gaji tetap bulanan sebesar Rp 500.000 ke rekening operasional.`
              },
              {
                id: 'reduce_cash_leaks',
                title: 'Kurangi Transaksi Tunai Tanpa Rincian',
                badge: 'Efisiensi Pencatatan',
                badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                desc: 'Tarik tunai ATM besar harus didetailkan kembali transaksinya di FinTrack. Prioritaskan pembayaran nontunai (QRIS/E-Wallet/Transfer) agar tercatat otomatis oleh sistem.'
              }
            ].map((rec) => {
              const isDone = !!completedRecommendations[rec.id]
              return (
                <div 
                  key={rec.id}
                  onClick={() => toggleRecommendation(rec.id)}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer flex gap-3.5 select-none",
                    isDone 
                      ? 'border-indigo-100 bg-indigo-50/10 shadow-sm opacity-75' 
                      : 'border-slate-100 bg-white hover:border-indigo-100 hover:shadow-sm'
                  )}
                >
                  <input 
                    type="checkbox" 
                    checked={isDone}
                    onChange={() => {}} // Handled by parent div click
                    className="w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn(
                        "text-xs font-bold transition-all",
                        isDone ? 'text-slate-500 line-through' : 'text-slate-800'
                      )}>
                        {rec.title}
                      </span>
                      <span className={cn("inline-flex px-2 py-0.5 rounded text-[9px] font-bold border shrink-0", rec.badgeColor)}>
                        {rec.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {rec.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
