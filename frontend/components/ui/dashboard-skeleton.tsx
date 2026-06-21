import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      
      {/* Transaction Chart */}
      <Skeleton className="h-[400px] w-full rounded-xl" />
      
      {/* Financial Insights */}
      <div className="grid gap-4 md:grid-cols-2">
         {[1, 2].map(i => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
