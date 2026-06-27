import { CheckCircle2, Trash2, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NumericFormat } from 'react-number-format'
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
    ? scanResult.items.filter(isReceiptItem)
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="receipt-type" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Type</label>
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
            <label htmlFor="merchant" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Merchant / Bank</label>
            <Input
              id="merchant"
              aria-label="Merchant / Bank"
              value={scanResult.merchant || ''}
              onChange={(e) => updateScanResultField('merchant', e.target.value)}
              className="h-8 text-sm font-bold"
            />
          </div>
          <div>
            <label htmlFor="receipt-date" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date & Time</label>
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
            <label htmlFor="total-amount" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 sm:text-right">Total Amount</label>
            <NumericFormat
              customInput={Input}
              id="total-amount"
              aria-label="Total Amount"
              value={scanResult.total || 0}
              onValueChange={(values) => updateScanResultField('total', values.floatValue || 0)}
              thousandSeparator="."
              decimalSeparator=","
              className="h-8 text-sm font-bold text-right text-indigo-600 font-mono"
            />
          </div>

          {(scanResult.type || 'shopping') === 'atm' ? (
            <>
              <div>
                <label htmlFor="atm-id" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ATM ID / Terminal</label>
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
                <label htmlFor="transaction-type" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transaction Type</label>
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
                <label htmlFor="admin-fee" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 sm:text-right">Admin Fee</label>
                <NumericFormat
                  customInput={Input}
                  id="admin-fee"
                  aria-label="Admin Fee"
                  value={scanResult.fee || 0}
                  onValueChange={(values) => updateScanResultField('fee', values.floatValue || 0)}
                  thousandSeparator="."
                  decimalSeparator=","
                  className="h-8 text-xs font-bold font-mono text-right"
                />
              </div>
              <div>
                <label htmlFor="atm-reference" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor Referensi</label>
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
              <div className="sm:col-span-2">
                <label htmlFor="store-address" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Store Address</label>
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
                <label htmlFor="payment-method" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method</label>
                <Input
                  id="payment-method"
                  aria-label="Payment Method"
                  value={scanResult.paymentMethod || 'Cash'}
                  onChange={(e) => updateScanResultField('paymentMethod', e.target.value)}
                  className="h-8 text-xs font-bold"
                />
              </div>
              <div>
                <label htmlFor="cash-paid" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 sm:text-right">Cash Paid</label>
                <NumericFormat
                  customInput={Input}
                  id="cash-paid"
                  aria-label="Cash Paid"
                  value={scanResult.amountPaid || scanResult.total || 0}
                  onValueChange={(values) => updateScanResultField('amountPaid', values.floatValue || 0)}
                  thousandSeparator="."
                  decimalSeparator=","
                  className="h-8 text-xs font-bold text-right font-mono"
                />
              </div>
              <div>
                <label htmlFor="change-amount" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 sm:text-right">Change (Kembalian)</label>
                <NumericFormat
                  customInput={Input}
                  id="change-amount"
                  aria-label="Change"
                  value={scanResult.change || 0}
                  onValueChange={(values) => updateScanResultField('change', values.floatValue || 0)}
                  thousandSeparator="."
                  decimalSeparator=","
                  className="h-8 text-xs font-bold text-right font-mono"
                />
              </div>
              <div>
                <label htmlFor="shopping-reference" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor Referensi</label>
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
          <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-100 max-h-none overflow-y-visible sm:max-h-[200px] sm:overflow-y-auto overflow-x-hidden shadow-inner">
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
                 <div
                   key={i}
                   className="flex flex-col gap-2 p-2.5 bg-white rounded-xl border border-slate-200/60 shadow-sm sm:flex-row sm:items-center sm:gap-2 sm:p-0 sm:bg-transparent sm:border-none sm:shadow-none sm:border-b sm:border-slate-200 sm:border-dashed sm:pb-2 sm:last:border-0 sm:last:pb-0"
                 >
                   {/* Row 1: Product Name and Delete button */}
                   <div className="flex items-center gap-2 w-full sm:flex-1">
                     <Input
                       aria-label={`Nama produk item ${i + 1}`}
                       value={item.name}
                       onChange={(e) => updateScanResultItem(i, 'name', e.target.value)}
                       className="h-8 text-xs flex-1 bg-slate-50 border-slate-200 focus-visible:ring-1 sm:h-7 sm:text-[11px] sm:bg-transparent sm:border-none rounded-lg"
                       placeholder="Nama produk"
                     />
                     <button
                       onClick={() => deleteScanResultItem(i)}
                       className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors sm:p-1"
                       aria-label="Hapus item ini"
                     >
                       <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                     </button>
                   </div>

                   <div className="flex items-center gap-2 w-full sm:w-auto">
                     <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider sm:hidden">QTY</span>
                       <Input
                         aria-label={`Jumlah item ${i + 1}`}
                         type="number"
                         value={item.quantity ?? 1}
                         onChange={(e) => {
                           const qty = parseFloat(e.target.value) || 0
                           const oldQty = item.quantity ?? 1
                           const price = item.price ?? (oldQty > 0 ? (item.amount ?? 0) / oldQty : (item.amount ?? 0))
                           updateScanResultItem(i, 'quantity', qty)
                           updateScanResultItem(i, 'price', price)
                           updateScanResultItem(i, 'amount', qty * price)
                         }}
                         className="h-8 text-xs w-full text-center bg-slate-50 border-slate-200 focus-visible:ring-1 font-mono sm:h-7 sm:text-[11px] sm:w-12 sm:bg-transparent sm:border-none rounded-lg"
                         placeholder="Qty"
                       />
                       <span className="text-slate-400 text-[10px] px-0.5 hidden sm:inline">×</span>
                     </div>

                     <div className="flex items-center gap-1.5 flex-2 sm:flex-none">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider sm:hidden">HARGA</span>
                       <NumericFormat
                         customInput={Input}
                         aria-label={`Harga satuan item ${i + 1}`}
                         value={item.price ?? ((item.quantity ?? 1) > 0 ? (item.amount ?? 0) / (item.quantity ?? 1) : (item.amount ?? 0))}
                         onValueChange={(values) => {
                           const price = values.floatValue || 0
                           const qty = item.quantity ?? 1
                           updateScanResultItem(i, 'price', price)
                           updateScanResultItem(i, 'quantity', qty)
                           updateScanResultItem(i, 'amount', qty * price)
                         }}
                         thousandSeparator="."
                         decimalSeparator=","
                         className="h-8 text-xs w-full text-right bg-slate-50 border-slate-200 focus-visible:ring-1 font-mono sm:h-7 sm:text-[11px] sm:w-20 sm:bg-transparent sm:border-none rounded-lg"
                         placeholder="Harga"
                       />
                       <span className="text-slate-400 text-[10px] px-0.5 hidden sm:inline">=</span>
                     </div>
                   </div>

                   <div className="flex items-center justify-between w-full border-t border-slate-100 pt-1.5 mt-0.5 sm:w-auto sm:border-none sm:pt-0 sm:mt-0 sm:justify-end">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider sm:hidden">TOTAL</span>
                     <span
                       aria-label={`Subtotal item ${i + 1}`}
                       className="text-xs font-bold text-slate-700 font-mono w-20 text-right px-1 sm:text-[11px] sm:text-slate-600 sm:font-bold"
                     >
                       {(item.amount || 0).toLocaleString('id-ID')}
                     </span>
                   </div>
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
