import BankStatementList from '@/components/transactions/BankStatementList'
import StatementAnalytics from '@/components/statements/StatementAnalytics'
import Link from 'next/link'
import { FileText } from 'lucide-react'

export default function BankStatementsPage() {
  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">Bank Statements</h1>
          <p className="text-sm text-slate-500">View and manage statement files uploaded from all your bank accounts</p>
        </div>
        
        <Link
          href="/add?scan=BankStatement"
          className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 py-2 shadow-md shadow-indigo-200"
        >
          <FileText className="w-4 h-4 mr-2" /> Upload Statement
        </Link>
      </div>

      <StatementAnalytics />

      <BankStatementList />
    </div>
  )
}
