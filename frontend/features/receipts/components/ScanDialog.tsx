'use client'

import { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useDropzone } from 'react-dropzone'
import { UploadCloud, CheckCircle2, Sparkles, AlertCircle, Trash2, Plus } from 'lucide-react'
import { saveReceipt } from "@/features/receipts/actions/receipts"
import { useRouter } from 'next/navigation'
import { scanDocumentWithAI } from '@/features/receipts/actions/ocr'
import { compressImageIfNeeded } from '@/lib/ocr/compress-image'
import { saveBankStatement } from '@/features/bank-statements/actions/statements'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ReceiptItem, BankTransaction } from '@/lib/ocr/types'
import { useScanStore } from '@/features/receipts/hooks/use-scan-store'

function isReceiptItem(item: ReceiptItem | BankTransaction): item is ReceiptItem {
  return 'name' in item && 'amount' in item && !('date' in item);
}

function isBankTransaction(item: ReceiptItem | BankTransaction): item is BankTransaction {
  return 'date' in item && 'amount' in item;
}

export function ScanDialog({ scanContext }: { scanContext: 'Receipt' | 'BankStatement' }) {
  const router = useRouter()
  const {
    fileToScan,
    scanStatus,
    scanProgress,
    scanResult,
    errorMessage,
    setFileToScan,
    setScanStatus,
    setScanProgress,
    setScanResult,
    setErrorMessage,
    resetScan,
    updateScanResultItem,
    deleteScanResultItem,
    addScanResultItem,
    updateScanResultField,
  } = useScanStore()


  const receiptItems = scanContext === 'Receipt' && scanResult && scanResult.items
    ? (scanResult.items || []).filter(isReceiptItem)
    : []

  const bankTransactions = scanContext === 'BankStatement' && scanResult && scanResult.items
    ? (scanResult.items || []).filter(isBankTransaction)
    : []

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      let file = acceptedFiles[0]
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      
      if (isPdf && file.size > 1024 * 1024) {
        setErrorMessage('File size exceeds the 1MB limit for PDFs.')
        setScanStatus('error')
        setFileToScan(null)
        return
      }

      if (!isPdf && file.size > 1024 * 1024) {
        file = await compressImageIfNeeded(file)
      }

      setFileToScan(file)
      setScanStatus('idle')
      setScanResult(null)
      setErrorMessage(null)
    }
  }, [setErrorMessage, setScanStatus, setFileToScan, setScanResult])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  })

  const handleProcessScan = async () => {
    if (!fileToScan) return
    setScanStatus('scanning')
    setScanProgress(0)
    setErrorMessage(null)
    
    // Animate progress up to 90% while waiting for API response
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 5
      })
    }, 150)
    
    const formData = new FormData()
    formData.append('file', fileToScan)
    formData.append('context', scanContext)
    
    // Get browser timezone offset in ISO8601 format (e.g. +07:00)
    const offsetMinutes = new Date().getTimezoneOffset()
    const absOffset = Math.abs(offsetMinutes)
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0')
    const mins = String(absOffset % 60).padStart(2, '0')
    const offsetStr = `${offsetMinutes <= 0 ? '+' : '-'}${hours}:${mins}`
    formData.append('timezoneOffset', offsetStr)
    
    const result = await scanDocumentWithAI(formData)
    
    clearInterval(progressInterval)
    setScanProgress(100)
    
    if (result.success) {
      setScanResult(result.data ?? null)
      setScanStatus('success')
    } else {
      setScanStatus('error')
      setErrorMessage(result.error)
    }
  }

  const handleSaveScannedItems = async () => {
    if (!scanResult || !fileToScan) return
    setScanStatus('scanning') // Use scanning as loading state for save
    
    try {
      if (scanContext === 'Receipt') {
        const result = await saveReceipt({
          type: scanResult.type || 'shopping',
          storeName: scanResult.merchant || 'Unknown Merchant',
          storeAddress: scanResult.address || null,
          date: scanResult.date || new Date().toISOString(),
          totalPrice: scanResult.total || 0,
          paymentMethod: scanResult.paymentMethod || 'Cash',
          amountPaid: scanResult.amountPaid || scanResult.total || 0,
          change: scanResult.change || 0,
          atmId: scanResult.atmId || null,
          transactionType: scanResult.transactionType || null,
          fee: scanResult.fee || 0,
          bankStatementItemId: null,
          items: receiptItems.map(item => ({
            productName: item.name,
            quantity: item.quantity || 1,
            price: item.price || item.amount || 0,
          })),
          file: fileToScan,
        })
        if (!result.success) {
          setScanStatus('error')
          setErrorMessage(result.error)
          return
        }
      } else if (scanContext === 'BankStatement') {
        const result = await saveBankStatement({
          bankName: scanResult.bank || 'Unknown Bank',
          statementPeriod: scanResult.statementPeriod || 'Unknown Period',
          openingBalance: scanResult.openingBalance,
          closingBalance: scanResult.closingBalance,
          items: bankTransactions,
          file: fileToScan
        })
        if (!result.success) {
          setScanStatus('error')
          setErrorMessage(result.error)
          return
        }
      }
      
      resetScan()
      router.push('/')
    } catch (err) {
      setScanStatus('error')
      const message = err instanceof Error ? err.message : 'Failed to save data.'
      setErrorMessage(message)
    }
  }

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl bg-gradient-to-br from-indigo-50 to-white flex-1 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <CardTitle className="text-lg font-bold text-indigo-950">
            {scanContext === 'Receipt' ? 'Smart Receipt Scanner' : 'Bank Statement AI'}
          </CardTitle>
        </div>
        <CardDescription className="text-indigo-900/60 font-medium">
          {scanContext === 'Receipt' 
            ? 'Upload a receipt and let our AI extract the total and items instantly.' 
            : 'Upload a PDF statement to automatically categorize multiple transactions.'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!fileToScan && (
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ease-in-out
              ${isDragActive ? 'border-indigo-500 bg-indigo-100 shadow-inner' : 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 bg-white/50'}`}
          >
            <input {...getInputProps()} />
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8 text-indigo-500" />
            </div>
            <p className="text-sm font-bold tracking-tight text-indigo-950 mb-1">
              Drag & drop your {scanContext === 'Receipt' ? 'receipt image' : 'PDF statement'} here
            </p>
          </div>
        )}

        {!fileToScan && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 shadow-sm text-left">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-900 leading-relaxed font-semibold">
              <p className="font-bold text-amber-950 mb-0.5">Info Unggah PDF (OCR.space API):</p>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-900/90 font-medium">
                <li>Ukuran file maksimal: <strong>1MB</strong></li>
                <li>Maksimal halaman: <strong>3 Halaman</strong></li>
                <li>Jatah kuota bulanan: <strong>25.000 request</strong></li>
              </ul>
            </div>
          </div>
        )}

        {fileToScan && scanStatus === 'idle' && (
          <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-slate-800 truncate">{fileToScan.name}</p>
                <p className="text-xs text-slate-500">{(fileToScan.size / 1024).toFixed(0)} KB</p>
              </div>
              <Button size="sm" variant="ghost" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => setFileToScan(null)}>
                Remove
              </Button>
            </div>
            <Button onClick={handleProcessScan} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md shadow-indigo-200">
              <Sparkles className="w-4 h-4 mr-2" /> Extract with AI
            </Button>
          </div>
        )}

        {scanStatus === 'scanning' && (
          <div className="bg-white border border-indigo-100 rounded-xl p-6 text-center space-y-4 shadow-sm">
            <div className="relative w-20 h-20 mx-auto">
              <svg className="animate-spin w-full h-full text-indigo-100" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75 text-indigo-600" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-700">{scanProgress}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Analyzing Document...</p>
              <p className="text-xs text-slate-500 mt-1">Our AI is extracting relevant financial data</p>
            </div>
          </div>
        )}

        {scanStatus === 'error' && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 text-center space-y-4 shadow-sm">
            <div className="bg-rose-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Processing Failed</p>
              <p className="text-xs text-rose-600/90 mt-2 break-words leading-relaxed">{errorMessage}</p>
            </div>
            <Button variant="outline" className="w-full font-bold h-10 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setScanStatus('idle')}>
              Try Again
            </Button>
          </div>
        )}

        {scanStatus === 'success' && scanResult && (
          <div className="bg-white border border-emerald-100 rounded-xl p-0 overflow-hidden shadow-sm">
            <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <p className="text-sm font-bold text-emerald-800">Extraction Successful - Review & Edit</p>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {scanContext === 'Receipt' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Type</p>
                      <select
                        value={scanResult.type || 'shopping'}
                        onChange={(e) => updateScanResultField('type', e.target.value as 'shopping' | 'atm')}
                        className="h-8 w-full text-xs font-bold rounded-md border border-slate-200 bg-white px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="shopping">Belanja (Shopping)</option>
                        <option value="atm">ATM (Withdrawal/Deposit)</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Merchant / Bank</p>
                      <Input 
                        value={scanResult.merchant || ''} 
                        onChange={(e) => updateScanResultField('merchant', e.target.value)}
                        className="h-8 text-sm font-bold"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
                      <Input 
                        type="datetime-local"
                        value={scanResult.date ? scanResult.date.slice(0, 16) : ''} 
                        onChange={(e) => updateScanResultField('date', e.target.value ? new Date(e.target.value).toISOString() : '')}
                        className="h-8 text-xs font-bold font-mono"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">Total Amount</p>
                      <Input 
                        type="number"
                        value={scanResult.total || 0} 
                        onChange={(e) => updateScanResultField('total', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm font-bold text-right text-indigo-600 font-mono"
                      />
                    </div>

                    {(scanResult.type || 'shopping') === 'atm' ? (
                      <>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ATM ID / Terminal</p>
                          <Input 
                            value={scanResult.atmId || ''} 
                            onChange={(e) => updateScanResultField('atmId', e.target.value)}
                            className="h-8 text-xs font-bold"
                            placeholder="e.g. ATM001"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transaction Type</p>
                          <select
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
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Admin Fee</p>
                          <Input 
                            type="number"
                            value={scanResult.fee || 0} 
                            onChange={(e) => updateScanResultField('fee', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs font-bold font-mono"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor Referensi</p>
                          <Input 
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
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Store Address</p>
                          <Input 
                            value={scanResult.address || ''} 
                            onChange={(e) => updateScanResultField('address', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="e.g. Jl. Raya Kemang No. 10"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method</p>
                          <Input 
                            value={scanResult.paymentMethod || 'Cash'} 
                            onChange={(e) => updateScanResultField('paymentMethod', e.target.value)}
                            className="h-8 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">Cash Paid</p>
                          <Input 
                            type="number"
                            value={scanResult.amountPaid || scanResult.total || 0} 
                            onChange={(e) => updateScanResultField('amountPaid', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs font-bold text-right font-mono"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Change (Kembalian)</p>
                          <Input 
                            type="number"
                            value={scanResult.change || 0} 
                            onChange={(e) => updateScanResultField('change', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs font-bold font-mono"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor Referensi</p>
                          <Input 
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
                          title="Tambah item baru"
                        >
                          <Plus className="w-3 h-3" />
                          Tambah Item
                        </button>
                      </div>
                      {receiptItems.length > 0 ? (
                        receiptItems.map((item, i) => (
                          <div key={i} className="flex gap-2 items-center border-b border-slate-200 border-dashed pb-2 last:border-0 last:pb-0">
                            <Input 
                              value={item.name} 
                              onChange={(e) => updateScanResultItem(i, 'name', e.target.value)}
                              className="h-7 text-[11px] flex-1 bg-transparent border-none focus-visible:ring-1"
                              placeholder="Nama produk"
                            />
                            <Input 
                              type="number"
                              value={item.amount} 
                              onChange={(e) => updateScanResultItem(i, 'amount', parseFloat(e.target.value))}
                              className="h-7 text-[11px] w-24 text-right bg-transparent border-none focus-visible:ring-1 font-mono"
                              placeholder="Harga"
                            />
                            <button
                              onClick={() => deleteScanResultItem(i)}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                              title="Hapus item ini"
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
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bank Name</p>
                      <Input 
                        value={scanResult.bank} 
                        onChange={(e) => updateScanResultField('bank', e.target.value)}
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">Period</p>
                      <Input 
                        value={scanResult.statementPeriod} 
                        onChange={(e) => updateScanResultField('statementPeriod', e.target.value)}
                        className="h-8 text-xs font-bold text-right"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Awal</p>
                      <Input 
                        type="number"
                        value={scanResult.openingBalance ?? 0} 
                        onChange={(e) => updateScanResultField('openingBalance', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs font-bold font-mono"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">Saldo Akhir</p>
                      <Input 
                        type="number"
                        value={scanResult.closingBalance ?? 0} 
                        onChange={(e) => updateScanResultField('closingBalance', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs font-bold text-right font-mono text-indigo-600"
                      />
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 space-y-2 border border-slate-100 max-h-[220px] overflow-y-auto shadow-inner">
                    {bankTransactions.map((item, i) => (
                      <div key={i} className="bg-white p-2 rounded border border-slate-200 shadow-sm space-y-2 transition-all hover:border-indigo-200">
                        <div className="flex gap-2 items-center">
                          <Input 
                            value={item.name} 
                            onChange={(e) => updateScanResultItem(i, 'name', e.target.value)}
                            className="h-7 text-[11px] font-bold flex-1"
                          />
                          <select 
                            value={item.type} 
                            onChange={(e) => updateScanResultItem(i, 'type', e.target.value)}
                            className={`h-7 w-20 text-[10px] font-bold rounded-md border border-slate-200 bg-white px-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}
                          >
                            <option value="income">INCOME</option>
                            <option value="expense">EXPENSE</option>
                          </select>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input 
                            type="datetime-local"
                            value={item.date ? item.date.slice(0, 16) : ''} 
                            onChange={(e) => updateScanResultItem(i, 'date', e.target.value ? new Date(e.target.value).toISOString() : '')}
                            className="h-7 text-[10px] flex-1"
                          />
                          <Input 
                            type="number"
                            value={item.amount} 
                            onChange={(e) => updateScanResultItem(i, 'amount', parseFloat(e.target.value))}
                            className="h-7 text-[11px] w-24 text-right font-mono font-bold"
                          />
                          <button
                            onClick={() => deleteScanResultItem(i)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus transaksi ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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
        )}
      </CardContent>
    </Card>
  )
}

function FileText({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
  )
}
