'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useDropzone } from 'react-dropzone'
import { UploadCloud, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { insertTransaction } from "@/lib/actions/transactions"
import { useRouter } from 'next/navigation'

export function ScanDialog({ scanContext }: { scanContext: 'Receipt' | 'BankStatement' }) {
  const router = useRouter()
  const [fileToScan, setFileToScan] = useState<File | null>(null)
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [scanProgress, setScanProgress] = useState(0)
  const [scanResult, setScanResult] = useState<any>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFileToScan(acceptedFiles[0])
      setScanStatus('idle')
      setScanResult(null)
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
    setScanStatus('scanning')
    setScanProgress(0)
    
    // Simulate Gemini LLM processing
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return 95
        }
        return prev + 5
      })
    }, 100)
    
    setTimeout(() => {
      clearInterval(progressInterval)
      setScanProgress(100)
      setScanStatus('success')
      
      if (scanContext === 'Receipt') {
        setScanResult({
          items: [
            { name: "Nasi Goreng Spesial", amount: 35000 },
            { name: "Es Teh Manis", amount: 8000 },
            { name: "Kerupuk", amount: 5000 }
          ],
          total: 48000,
          category: "Food",
          merchant: "Warung Makan Sedap"
        })
      } else {
        setScanResult({
          items: [
            { date: "2023-11-15", name: "Salary Nov", amount: 15000000, type: "income", category: "Salary" },
            { date: "2023-11-16", name: "PLN Token", amount: 500000, type: "expense", category: "Utilities" },
            { date: "2023-11-18", name: "Supermarket", amount: 850000, type: "expense", category: "Food" }
          ],
          totalItems: 3,
          statementPeriod: "Nov 2023"
        })
      }
    }, 2500)
  }

  const handleSaveScannedItems = async () => {
    if (!scanResult) return
    setScanStatus('scanning') // Use scanning as loading state for save
    
    if (scanContext === 'Receipt') {
      await insertTransaction({
        date: new Date().toISOString().split('T')[0],
        amount: scanResult.total,
        category: scanResult.category,
        type: 'expense',
        note: `Receipt: ${scanResult.merchant}`,
        paymentMethod: 'Cash',
        change: 0
      })
    } else if (scanContext === 'BankStatement') {
      // Loop inserts for statement items
      for (const item of scanResult.items) {
        await insertTransaction({
          date: item.date || new Date().toISOString().split('T')[0],
          amount: item.amount,
          category: item.category || 'Other',
          type: item.type || 'expense',
          note: `Statement: ${item.name}`,
          paymentMethod: 'Transfer',
          change: 0
        })
      }
    }
    
    setScanStatus('idle')
    setScanResult(null)
    setFileToScan(null)
    router.push('/')
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
            <p className="text-xs text-indigo-900/60 font-medium">or click to browse files</p>
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

        {scanStatus === 'success' && scanResult && (
          <div className="bg-white border border-emerald-100 rounded-xl p-0 overflow-hidden shadow-sm">
            <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-sm font-bold text-emerald-800">Extraction Successful</p>
            </div>
            <div className="p-4 space-y-4">
              {scanContext === 'Receipt' ? (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Merchant</p>
                      <p className="font-bold text-slate-800">{scanResult.merchant}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Amount</p>
                      <p className="font-bold text-indigo-600 text-lg">Rp {scanResult.total.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-xs font-medium space-y-2 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identified Items</p>
                    {scanResult.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between border-b border-slate-200 border-dashed pb-1 last:border-0 last:pb-0">
                        <span className="text-slate-700">{item.name}</span>
                        <span className="font-mono">Rp {item.amount.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-slate-600">Found <span className="font-bold text-indigo-600">{scanResult.totalItems}</span> transactions</p>
                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200 uppercase tracking-wider">{scanResult.statementPeriod}</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2 border border-slate-100 max-h-[160px] overflow-y-auto">
                    {scanResult.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center border-b border-slate-200 border-dashed pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-slate-700">{item.name}</p>
                          <p className="text-[10px] text-slate-500">{item.date} • {item.category}</p>
                        </div>
                        <span className={`font-bold font-mono ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.type === 'income' ? '+' : '-'}Rp {item.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              <div className="pt-2 flex gap-3">
                <Button variant="outline" className="flex-1 font-bold h-10" onClick={() => { setScanStatus('idle'); setScanResult(null); }}>
                  Discard
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10" onClick={handleSaveScannedItems}>
                  Save All
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
