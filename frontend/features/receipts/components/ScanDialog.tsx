'use client'

import { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useDropzone } from 'react-dropzone'
import { UploadCloud, Sparkles, AlertCircle } from 'lucide-react'
import { compressImageIfNeeded } from '@/lib/ocr/compress-image'
import { Button } from "@/components/ui/button"
import { useScanStore } from '@/features/receipts/hooks/use-scan-store'
import { useOcrScanner } from '@/features/receipts/hooks/use-ocr-scanner'
import { ScanProgressIndicator } from './ScanProgressIndicator'
import { ReceiptReviewForm } from './ReceiptReviewForm'
import { BankStatementReviewForm } from './BankStatementReviewForm'
import { cn } from '@/lib/utils'

export function ScanDialog({ scanContext }: { scanContext: 'Receipt' | 'BankStatement' }) {
  const {
    fileToScan,
    scanStatus,
    scanProgress,
    scanResult,
    errorMessage,
    setFileToScan,
    setScanStatus,
    setScanResult,
    setErrorMessage,
  } = useScanStore()

  const { handleProcessScan } = useOcrScanner(scanContext)

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
            className={cn("border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ease-in-out",
              isDragActive ? 'border-indigo-500 bg-indigo-100 shadow-inner' : 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 bg-white/50')}
            role="button"
            aria-label={`Upload ${scanContext === 'Receipt' ? 'receipt image' : 'PDF statement'}`}
            tabIndex={0}
          >
            <input {...getInputProps()} />
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8 text-indigo-500" aria-hidden="true" />
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

        {(scanStatus === 'scanning' || scanStatus === 'error') && (
          <ScanProgressIndicator
            scanStatus={scanStatus}
            scanProgress={scanProgress}
            errorMessage={errorMessage}
            onRetry={() => setScanStatus('idle')}
          />
        )}

        {scanStatus === 'success' && scanResult && (
          scanContext === 'Receipt' ? <ReceiptReviewForm /> : <BankStatementReviewForm />
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
