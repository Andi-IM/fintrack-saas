import { DashboardSkeleton } from '@/components/ui/dashboard-skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header Row (Duplicated for 0ms transitions) */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-white h-10 px-4 py-2 shadow-md shadow-indigo-200 opacity-50 cursor-not-allowed">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus w-4 h-4 mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Add Transaction
        </div>
      </header>

      <DashboardSkeleton />
    </div>
  )
}
