import { getCashFlow } from '@/features/cash-flow/actions/cash_flow'
import { CashFlowList } from '@/features/cash-flow/components/CashFlowList'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    date?: string, 
    range?: string,
    search?: string,
    category?: string,
    payment?: string,
    source?: string,
    page?: string,
    pageSize?: string
  }>
}) {
  const { date, range = 'ALL', search, category, payment, source, page = '1', pageSize = '15' } = await searchParams
  const result = await getCashFlow({ 
    range, 
    date,
    search,
    category,
    payment_method: payment,
    source,
    page: parseInt(page, 10) || 1,
    limit: parseInt(pageSize, 10) || 15
  })

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">Arus Kas</h1>
          <p className="text-sm text-slate-500">Kelola dan lihat riwayat arus kas Anda</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/add"
            className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 py-2 shadow-md shadow-indigo-200"
          >
            <Plus className="w-4 h-4 mr-2" /> Tambah Arus Kas
          </Link>
        </div>
      </div>

      <CashFlowList 
        transactions={result.data} 
        totalItems={result.count}
        timeRange={range} 
      />
    </div>
  )
}