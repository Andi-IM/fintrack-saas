import { AlertCircle, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useScanStore } from '@/features/receipts/hooks/use-scan-store'
import { useSubmitScannedData } from '@/features/receipts/hooks/use-submit-scanned-data'
import { useBankStatementRescan } from '@/features/receipts/hooks/use-bank-statement-rescan'
import { isBankTransaction } from '../utils/scan-mapper'
import { cn } from '@/lib/utils'
import { formatDateForInput } from '@/lib/utils/date'

export function BankStatementReviewForm() {
  const {
    scanResult,
    errorMessage,
    updateScanResultItem,
    deleteScanResultItem,
    updateScanResultField,
    resetScan,
  } = useScanStore()

  const { handleSaveScannedItems } = useSubmitScannedData('BankStatement')
  const { handleReparseBankStatement, isRescanning, canReparseBankStatement } = useBankStatementRescan()

  if (!scanResult) return null

  return (
    <div className="bg-white border border-emerald-100 rounded-xl p-0 overflow-hidden shadow-sm">
      <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <p className="text-sm font-bold text-emerald-800">Extraction Successful - Review & Edit</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900"
          onClick={handleReparseBankStatement}
          disabled={!canReparseBankStatement || isRescanning}
        >
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isRescanning && 'animate-spin')} />
          {isRescanning ? 'Re-scanning' : 'Re-scan AI'}
        </Button>
      </div>
      <div className="p-4 space-y-4">
        {errorMessage && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="bank-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bank Name</label>
            <Input
              id="bank-name"
              aria-label="Bank Name"
              value={scanResult.bank || ''}
              onChange={(e) => updateScanResultField('bank', e.target.value)}
              className="h-8 text-xs font-bold"
            />
          </div>
          <div>
            <label htmlFor="statement-period" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">Period</label>
            <Input
              id="statement-period"
              aria-label="Period"
              value={scanResult.statementPeriod || ''}
              onChange={(e) => updateScanResultField('statementPeriod', e.target.value)}
              className="h-8 text-xs font-bold text-right"
            />
          </div>
          <div>
            <label htmlFor="opening-balance" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Awal</label>
            <Input
              id="opening-balance"
              type="number"
              aria-label="Opening Balance"
              value={scanResult.openingBalance ?? 0}
              onChange={(e) => updateScanResultField('openingBalance', parseFloat(e.target.value) || 0)}
              className="h-8 text-xs font-bold font-mono"
            />
          </div>
          <div>
            <label htmlFor="closing-balance" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">Saldo Akhir</label>
            <Input
              id="closing-balance"
              type="number"
              aria-label="Closing Balance"
              value={scanResult.closingBalance ?? 0}
              onChange={(e) => updateScanResultField('closingBalance', parseFloat(e.target.value) || 0)}
              className="h-8 text-xs font-bold text-right font-mono text-indigo-600"
            />
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-2 space-y-2 border border-slate-100 max-h-[220px] overflow-y-auto shadow-inner">
          {(scanResult.items || []).map((item, i) => isBankTransaction(item) && (
            <div key={i} className="bg-white p-2 rounded border border-slate-200 shadow-sm space-y-2 transition-all hover:border-indigo-200">
              <div className="flex gap-2 items-center">
                <Input
                  aria-label={`Nama transaksi bank ${i + 1}`}
                  value={item.name}
                  onChange={(e) => updateScanResultItem(i, 'name', e.target.value)}
                  className="h-7 text-[11px] font-bold flex-1"
                />
                <select
                  aria-label="Transaction Type"
                  value={item.type}
                  onChange={(e) => updateScanResultItem(i, 'type', e.target.value)}
                  className={cn("h-7 w-20 text-[10px] font-bold rounded-md border border-slate-200 bg-white px-1 focus:outline-none focus:ring-1 focus:ring-indigo-500", item.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}
                >
                  <option value="income">INCOME</option>
                  <option value="expense">EXPENSE</option>
                </select>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  aria-label={`Tanggal transaksi bank ${i + 1}`}
                  type="datetime-local"
                  value={item.date ? formatDateForInput(item.date) : ''}
                  onChange={(e) => updateScanResultItem(i, 'date', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="h-7 text-[10px] flex-1"
                />
                <Input
                  aria-label={`Nominal transaksi bank ${i + 1}`}
                  type="number"
                  value={item.amount}
                  onChange={(e) => updateScanResultItem(i, 'amount', parseFloat(e.target.value))}
                  className="h-7 text-[11px] w-24 text-right font-mono font-bold"
                />
                <button
                  onClick={() => deleteScanResultItem(i)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                  aria-label="Hapus transaksi ini"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

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
