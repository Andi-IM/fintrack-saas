import { getReceipts } from '@/lib/actions/receipts'
import { ReceiptList } from '@/components/receipts/ReceiptList'
import Link from 'next/link'
import { Camera } from 'lucide-react'

export default async function ReceiptsPage() {
  const response = await getReceipts()
  const receipts = response.success ? (response.data || []) : []

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">Receipts</h1>
          <p className="text-sm text-slate-500">Lihat, periksa, dan kelola semua struk belanja dan ATM yang telah dipindai</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href="/add?scan=Receipt"
            className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 py-2 shadow-md shadow-indigo-200"
          >
            <Camera className="w-4 h-4 mr-2" /> Pindai Struk Baru
          </Link>
        </div>
      </div>

      {!response.success && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-sm">
          Gagal mengambil data struk: {response.error}
        </div>
      )}

      <ReceiptList receipts={receipts} />
    </div>
  )
}
