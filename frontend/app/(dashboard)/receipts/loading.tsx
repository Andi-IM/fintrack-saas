import { Skeleton } from '@/components/ui/skeleton'
import { Camera } from 'lucide-react'

export default function ReceiptsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Row (Duplicated for 0ms transitions) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">Receipts</h1>
          <p className="text-sm text-slate-500">Lihat, periksa, dan kelola semua struk belanja dan ATM yang telah dipindai</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center rounded-md text-sm font-semibold bg-indigo-600 text-white h-10 px-4 py-2 shadow-md shadow-indigo-200 opacity-50 cursor-not-allowed">
            <Camera className="w-4 h-4 mr-2" /> Pindai Struk Baru
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
