'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useDropzone } from 'react-dropzone'
import { UploadCloud, CheckCircle2, Loader2, Sparkles, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { insertTransaction } from "@/lib/actions/transactions"
import { useRouter } from 'next/navigation'
import { scanDocumentWithAI } from '@/lib/actions/ocr'
import { saveBankStatement } from '@/lib/actions/statements'
import { Input } from "@/components/ui/input"

export function ScanDialog({ scanContext }: { scanContext: 'Receipt' | 'BankStatement' }) {
  const router = useRouter()
  const [fileToScan, setFileToScan] = useState<File | null>(null)
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [scanProgress, setScanProgress] = useState(0)
  const [scanResult, setScanResult] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleUpdateItem = (index: number, field: string, value: any) => {
    setScanResult((prev: any) => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }
      return { ...prev, items: newItems }
    })
  }

  const handleDeleteItem = (index: number) => {
    setScanResult((prev: any) => {
      const newItems = prev.items.filter((_: any, i: number) => i !== index)
      return { ...prev, items: newItems }
    })
  }

  const handleUpdateResult = (field: string, value: any) => {
    setScanResult((prev: any) => ({ ...prev, [field]: value }))
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      
      if (isPdf && file.size > 1024 * 1024) {
        setErrorMessage('File size exceeds the 1MB limit for PDFs.')
        setScanStatus('error')
        setFileToScan(null)
        return
      }

      setFileToScan(file)
      setScanStatus('idle')
      setScanResult(null)
      setErrorMessage(null)
    }
  }, [])

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
    
    try {
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
      
      if (result) {
        setScanResult(result)
        setScanStatus('success')
      } else {
        throw new Error('AI returned an empty result.')
      }
    } catch (err: any) {
      clearInterval(progressInterval)
      setScanStatus('error')
      setErrorMessage(err.message || 'Failed to process document with Google Cloud Vision.')
      console.error('OCR Client Error:', err)
    }
  }

  const handleSaveScannedItems = async () => {
    if (!scanResult || !fileToScan) return
    setScanStatus('scanning') // Use scanning as loading state for save
    
    try {
      if (scanContext === 'Receipt') {
        await insertTransaction({
          date: new Date().toISOString().split('T')[0],
          amount: scanResult.total,
          category: scanResult.category,
          type: 'expense',
          note: `Receipt: ${scanResult.merchant}`,
          paymentMethod: 'Cash',
          change: 0,
          items: scanResult.items
        })
      } else if (scanContext === 'BankStatement') {
        await saveBankStatement({
          bankName: scanResult.bank || 'Unknown Bank',
          statementPeriod: scanResult.statementPeriod || 'Unknown Period',
          openingBalance: scanResult.openingBalance,
          closingBalance: scanResult.closingBalance,
          items: scanResult.items,
          file: fileToScan
        })
      }
      
      setScanStatus('idle')
      setScanResult(null)
      setFileToScan(null)
      router.push('/')
    } catch (err: any) {
      setScanStatus('error')
      setErrorMessage(err.message || 'Failed to save data.')
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
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Merchant</p>
                      <Input 
                        value={scanResult.merchant} 
                        onChange={(e) => handleUpdateResult('merchant', e.target.value)}
                        className="h-8 text-sm font-bold"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">Total Amount</p>
                      <Input 
                        type="number"
                        value={scanResult.total} 
                        onChange={(e) => handleUpdateResult('total', parseFloat(e.target.value))}
                        className="h-8 text-sm font-bold text-right text-indigo-600"
                      />
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identified Items</p>
                    {scanResult.items.map((item: any, i: number) => (
                      <div key={i} className="flex gap-2 items-center border-b border-slate-200 border-dashed pb-2 last:border-0 last:pb-0">
                        <Input 
                          value={item.name} 
                          onChange={(e) => handleUpdateItem(i, 'name', e.target.value)}
                          className="h-7 text-[11px] flex-1 bg-transparent border-none focus-visible:ring-1"
                        />
                        <Input 
                          type="number"
                          value={item.amount} 
                          onChange={(e) => handleUpdateItem(i, 'amount', parseFloat(e.target.value))}
                          className="h-7 text-[11px] w-24 text-right bg-transparent border-none focus-visible:ring-1 font-mono"
                        />
                        <button
                          onClick={() => handleDeleteItem(i)}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                          title="Hapus item ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bank Name</p>
                      <Input 
                        value={scanResult.bank} 
                        onChange={(e) => handleUpdateResult('bank', e.target.value)}
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">Period</p>
                      <Input 
                        value={scanResult.statementPeriod} 
                        onChange={(e) => handleUpdateResult('statementPeriod', e.target.value)}
                        className="h-8 text-xs font-bold text-right"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Awal</p>
                      <Input 
                        type="number"
                        value={scanResult.openingBalance ?? 0} 
                        onChange={(e) => handleUpdateResult('openingBalance', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs font-bold font-mono"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">Saldo Akhir</p>
                      <Input 
                        type="number"
                        value={scanResult.closingBalance ?? 0} 
                        onChange={(e) => handleUpdateResult('closingBalance', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs font-bold text-right font-mono text-indigo-600"
                      />
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 space-y-2 border border-slate-100 max-h-[220px] overflow-y-auto shadow-inner">
                    {scanResult.items.map((item: any, i: number) => (
                      <div key={i} className="bg-white p-2 rounded border border-slate-200 shadow-sm space-y-2 transition-all hover:border-indigo-200">
                        <div className="flex gap-2 items-center">
                          <Input 
                            value={item.name} 
                            onChange={(e) => handleUpdateItem(i, 'name', e.target.value)}
                            className="h-7 text-[11px] font-bold flex-1"
                          />
                          <select 
                            value={item.type} 
                            onChange={(e) => handleUpdateItem(i, 'type', e.target.value)}
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
                            onChange={(e) => handleUpdateItem(i, 'date', e.target.value ? new Date(e.target.value).toISOString() : '')}
                            className="h-7 text-[10px] flex-1"
                          />
                          <Input 
                            type="number"
                            value={item.amount} 
                            onChange={(e) => handleUpdateItem(i, 'amount', parseFloat(e.target.value))}
                            className="h-7 text-[11px] w-24 text-right font-mono font-bold"
                          />
                          <button
                            onClick={() => handleDeleteItem(i)}
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
                <Button variant="outline" className="flex-1 font-bold h-10 shadow-sm" onClick={() => { setScanStatus('idle'); setScanResult(null); }}>
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
