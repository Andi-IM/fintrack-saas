import { Suspense } from 'react'
import { getCashFlow } from '@/features/cash-flow/actions/cash_flow'
import { OverviewCards } from '@/components/dashboard/OverviewCards'
import { TransactionChartLazy, FinancialInsightsLazy } from '@/components/dashboard/DynamicCharts'
import { DashboardSkeleton } from '@/components/ui/dashboard-skeleton'

async function DashboardData({ range }: { range: string }) {
  const result = await getCashFlow({ range })
  const transactions = result.data

  return (
    <div className="space-y-8">
      <OverviewCards transactions={transactions} timeRange={range} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section aria-label="Grafik Transaksi" className="min-w-0">
          <TransactionChartLazy transactions={transactions} timeRange={range} />
        </section>
        <section aria-label="Wawasan Keuangan" className="min-w-0">
          <FinancialInsightsLazy transactions={transactions} />
        </section>
      </div>
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range = '1M' } = await searchParams

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
        <a href="/add" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 py-2 shadow-md shadow-indigo-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus w-4 h-4 mr-2"><path d="M5 12h14" /><path d="M12 5v14" /></svg> Add Transaction
        </a>
      </header>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData range={range} />
      </Suspense>
    </div>
  )
}
