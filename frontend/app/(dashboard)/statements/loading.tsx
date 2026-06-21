import { StatementsSkeleton } from '@/components/ui/statements-skeleton'
import { FileText } from 'lucide-react'

export default function StatementsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Row (Duplicated for 0ms transitions) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">Bank Statements</h1>
          <p className="text-sm text-slate-500">View and manage statement files uploaded from all your bank accounts</p>
        </div>
        
        <div className="inline-flex items-center justify-center rounded-md text-sm font-semibold bg-indigo-600 text-white h-10 px-4 py-2 shadow-md shadow-indigo-200 opacity-50 cursor-not-allowed">
          <FileText className="w-4 h-4 mr-2" /> Upload Statement
        </div>
      </div>

      <StatementsSkeleton />
    </div>
  )
}
