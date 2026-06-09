import { getTransactions } from '@/lib/actions/transactions'
import { TransactionList } from '@/components/transactions/TransactionList'
import Link from 'next/link'
import { Plus, Camera } from 'lucide-react'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string, range?: string }>
}) {
  const { date, range = '1M' } = await searchParams
  const transactions = await getTransactions()

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500">Manage and view your financial transactions</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href="/add?scan=Receipt"
            className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-10 px-4 py-2"
          >
            <Camera className="w-4 h-4 mr-2" /> Scan Receipt
          </Link>
          
          <Link
            href="/add"
            className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 py-2 shadow-md shadow-indigo-200"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Transaction
          </Link>
        </div>
      </div>

      <TransactionList transactions={transactions} dateFilter={date} timeRange={range} />
    </div>
  )
}
