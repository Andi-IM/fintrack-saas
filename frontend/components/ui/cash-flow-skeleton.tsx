import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function CashFlowSkeleton() {
  return (
    <Card className="shadow-sm border-slate-200 rounded-xl bg-white">
      <CardHeader className="border-b border-slate-100 pb-4 px-6 pt-5">
         <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-24" />
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
         </div>
      </CardHeader>
      <CardContent className="p-0">
         <div className="hidden md:block">
            <div className="flex border-b border-slate-100 bg-slate-50 p-3">
               <Skeleton className="h-4 w-32 ml-6" />
               <Skeleton className="h-4 w-64 ml-24" />
               <Skeleton className="h-4 w-24 ml-auto" />
            </div>
            <div className="divide-y divide-slate-100">
               {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex p-4 items-center">
                     <Skeleton className="h-4 w-32 ml-2" />
                     <Skeleton className="h-4 w-64 ml-20" />
                     <Skeleton className="h-4 w-24 ml-auto" />
                  </div>
               ))}
            </div>
         </div>
         {/* Mobile Skeleton */}
         <div className="md:hidden p-4 space-y-4">
            {[1, 2, 3].map(i => (
               <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
         </div>
      </CardContent>
    </Card>
  )
}
