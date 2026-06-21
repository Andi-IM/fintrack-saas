import { Skeleton } from '@/components/ui/skeleton'

export function StatementAnalyticsSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Memuat analitik bank">
      {/* Overview Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
         ))}
      </div>
      
      {/* Balance Chart Skeleton */}
      <Skeleton className="h-[380px] w-full rounded-xl" />

      {/* Total Saldo Chart Skeleton */}
      <Skeleton className="h-[280px] w-full rounded-xl" />

      {/* Bank Summary Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
         {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[110px] w-full rounded-xl" />
         ))}
      </div>
    </div>
  )
}

export function BankStatementListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Memuat daftar mutasi bank">
      {[1, 2].map((i) => (
        <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="w-full flex items-center justify-between p-4 bg-slate-50/50 border-b border-slate-100">
             <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <Skeleton className="w-32 h-5" />
             </div>
             <Skeleton className="w-5 h-5 rounded-full" />
          </div>
          <div className="p-4 space-y-3">
             {[1, 2, 3].map(j => (
                <Skeleton key={j} className="h-12 w-full rounded-lg" />
             ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatementsSkeleton() {
  return (
    <div className="space-y-6">
      <StatementAnalyticsSkeleton />
      <BankStatementListSkeleton />
    </div>
  )
}
