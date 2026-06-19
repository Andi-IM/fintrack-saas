import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ScanProgressIndicatorProps {
  scanStatus: 'scanning' | 'error'
  scanProgress: number
  errorMessage: string | null
  onRetry: () => void
}

export function ScanProgressIndicator({
  scanStatus,
  scanProgress,
  errorMessage,
  onRetry,
}: ScanProgressIndicatorProps) {
  if (scanStatus === 'scanning') {
    return (
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
    )
  }

  if (scanStatus === 'error') {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 text-center space-y-4 shadow-sm">
        <div className="bg-rose-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Processing Failed</p>
          <p className="text-xs text-rose-600/90 mt-2 break-words leading-relaxed">{errorMessage}</p>
        </div>
        <Button
          variant="outline"
          className="w-full font-bold h-10 border-rose-200 text-rose-700 hover:bg-rose-50"
          onClick={onRetry}
        >
          Try Again
        </Button>
      </div>
    )
  }

  return null
}
