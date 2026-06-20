import { CheckCircle2, Trash2, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useScanStore } from '@/features/receipts/hooks/use-scan-store'
import { useSubmitScannedData } from '@/features/receipts/hooks/use-submit-scanned-data'
import { isReceiptItem } from '../utils/scan-mapper'

export function ReceiptReviewForm() {
  const {
    scanResult,
    updateScanResultItem,
    deleteScanResultItem,
    addScanResultItem,
    updateScanResultField,
    resetScan,
  } = useScanStore()

  const { handleSaveScannedItems } = useSubmitScannedData('Receipt')

  if (!scanResult) return null

  const receiptItems = scanResult.items
    ? (scanResult.items || []).filter(isReceiptItem)
    : []

  return (
    <div className="bg-white border border-emerald-100 rounded-xl p-0 overflow-hidden shadow-sm">
      <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <p className="text-sm font-bold text-emerald-800">Extraction Successful - Review & Edit</p>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="receipt-type" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Type</label>
            <select
              id="receipt-type"
              aria-label="Receipt Type"
              value={scanResult.type || 'shopping'}
              onChange={(e) => updateScanResultField('type', e.target.value as 'shopping' | 'atm')}
              className="h-8 w-full text-xs font-bold rounded-md border border-slate-200 bg-white px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="shopping">Belanja (Shopping)</option>
              <option value="atm">ATM (Withdrawal/Deposit)</option>
            </select>
          </div>
          <div>
            <label htmlFor="merchant" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Merchant / Bank</label>
            <Input
              id="merchant"
              aria-label="Merchant / Bank"
              value={scanResult.merchant || ''}
              onChange={(e) => updateScanResultField('merchant', e.target.value)}
              className="h-8 text-sm font-bold"
            />
          </div>
          <div>
            <label htmlFor="receipt-date" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date & Time</label>
            <Input
              id="receipt-date"
              type="datetime-local"
              aria-label="Date & Time"
              value={scanResult.date ? scanResult.date.slice(0, 16) : ''}
              onChange={(e) => updateScanResultField('date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="h-8 text-xs font-bold font-mono"
            />
          </div>
          <div>
            <label htmlFor="total-amount" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">Total Amount</label>
            <Input
              id="total-amount"
              type="number"
              aria-label="Total Amount"
              value={scanResult.total || 0}
              onChange={(e) => updateScanResultField('total', parseFloat(e.target.value) || 0)}
              className="h-8 text-sm font-bold text-right text-indigo-600 font-mono"
            />
          </div>

          {(scanResult.type || 'shopping') === 'atm' ? (
            <>
              <div>
                <label htmlFor="atm-id" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ATM ID / Terminal</label>
                <Input
                  id="atm-id"
                  aria-label="ATM ID / Terminal"
                  value={scanResult.atmId || ''}
                  onChange={(e) => updateScanResultField('atmId', e.target.value)}
                  className="h-8 text-xs font-bold"
                  placeholder="e.g. ATM001"
                />
              </div>
              <div>
                <label htmlFor="transaction-type" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transaction Type</label>
                <select
                  id="transaction-type"
                  aria-label="Transaction Type"
                  value={scanResult.transactionType || 'withdrawal'}
                  onChange={(e) => updateScanResultField('transactionType', e.target.value as any)}
                  className="h-8 w-full text-xs font-bold rounded-md border border-slate-200 bg-white px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="withdrawal">Penarikan (Withdrawal)</option>
                  <option value="deposit">Setoran (Deposit)</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div>
                <label htmlFor="admin-fee" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Admin Fee</label>
                <Input
                  id="admin-fee"
                  type="number"
                  aria-label="Admin Fee"
                  value={scanResult.fee || 0}
                  onChange={(e) => updateScanResultField('fee', parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-bold font-mono"
                />
              </div>
              <div>
                <label htmlFor="atm-reference" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor Referensi</label>
                <Input
                  id="atm-reference"
                  aria-label="Nomor Referensi"
                  value={scanResult.referenceNumber || ''}
                  onChange={(e) => updateScanResultField('referenceNumber', e.target.value)}
                  className="h-8 text-xs font-bold font-mono"
                  placeholder="e.g. Ref No"
                />
              </div>
            </>
          ) : (
            <>
              <div className="col-span-2">
                <label htmlFor="store-address" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Store Address</label>
                <Input
                  id="store-address"
                  aria-label="Store Address"
                  value={scanResult.address || ''}
                  onChange={(e) => updateScanResultField('address', e.target.value)}
                  className="h-8 text-xs"
                  placeholder="e.g. Jl. Raya Kemang No. 10"
                />
              </div>
              <div>
                <label htmlFor="payment-method" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method</label>
                <Input
                  id="payment-method"
                  aria-label="Payment Method"
                  value={scanResult.paymentMethod || 'Cash'}
                  onChange={(e) => updateScanResultField('paymentMethod', e.target.value)}
                  className="h-8 text-xs font-bold"
                />
              </div>
              <div>
                <label htmlFor="cash-paid" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">Cash Paid</label>
                <Input
                  id="cash-paid"
                  type="number"
                  aria-label="Cash Paid"
                  value={scanResult.amountPaid || scanResult.total || 0}
                  onChange={(e) => updateScanResultField('amountPaid', parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-bold text-right font-mono"
                />
              </div>
              <div>
                <label htmlFor="change-amount" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Change (Kembalian)</label>
                <Input
                  id="change-amount"
                  type="number"
                  aria-label="Change"
                  value={scanResult.change || 0}
                  onChange={(e) => updateScanResultField('change', parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-bold font-mono"
                />
              </div>
              <div>
                <label htmlFor="shopping-reference" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor Referensi</label>
                <Input
                  id="shopping-reference"
                  aria-label="Nomor Referensi"
                  value={scanResult.referenceNumber || ''}
                  onChange={(e) => updateScanResultField('referenceNumber', e.target.value)}
                  className="h-8 text-xs font-bold font-mono"
                  placeholder="e.g. Ref No"
                />
              </div>
            </>
          )}
        </div>

        {(scanResult.type || 'shopping') !== 'atm' && (
          <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-100 max-h-[200px] overflow-y-auto shadow-inner">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identified Items</p>
              <button
                onClick={() => addScanResultItem()}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-0.5 rounded transition-colors"
                aria-label="Tambah item baru"
              >
                <Plus className="w-3 h-3" />
                Tambah Item
              </button>
            </div>
{receiptItems.length > 0 ? (
               receiptItems.map((item, i) => (
                 <div key={i} className="flex gap-2 items-center border-b border-slate-200 border-dashed pb-2 last:border-0 last:pb-0">
                   <Input
                     aria-label={`Nama produk item ${i + 1}`}
                     value={item.name}
                     onChange={(e) => updateScanResultItem(i, 'name', e.target.value)}
                     className="h-7 text-[11px] flex-1 bg-transparent border-none focus-visible:ring-1"
                     placeholder="Nama produk"
                   />
                   <Input
                     aria-label={`Harga item ${i + 1}`}
                     type="number"
                     value={item.amount}
                     onChange={(e) => updateScanResultItem(i, 'amount', parseFloat(e.target.value))}
                     className="h-7 text-[11px] w-24 text-right bg-transparent border-none focus-visible:ring-1 font-mono"
                     placeholder="Harga"
                   />
                   <button
                 onClick={() => deleteScanResultItem(i)}
                 className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                 aria-label="Hapus item ini"
               >
                 <Trash2 className="w-3.5 h-3.5" />
               </button>
                 </div>
               ))
             ) : (
              <p className="text-[11px] text-slate-400 italic text-center py-2">Belum ada item terdeteksi. Klik &quot;Tambah Item&quot; untuk menambahkan.</p>
            )}
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <Button variant="outline" className="flex-1 font-bold h-10 shadow-sm" onClick={resetScan}>
            Discard
          </Button>
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-md shadow-emerald-100" onClick={handleSaveScannedItems}>
            Confirm & Save
          </Button>
        </div>
      </div>
    </div>
  )
}
