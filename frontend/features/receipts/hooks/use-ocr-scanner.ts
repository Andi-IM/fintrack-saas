import { useScanStore } from '@/features/receipts/hooks/use-scan-store'
import { scanDocumentWithAI } from '@/features/receipts/actions/ocr'
import { getBrowserTimezoneOffset } from '@/lib/utils/date'

export function useOcrScanner(scanContext: 'Receipt' | 'BankStatement') {
  const {
    fileToScan,
    setScanStatus,
    setScanProgress,
    setScanResult,
    setErrorMessage,
  } = useScanStore()

  const handleProcessScan = async () => {
    if (!fileToScan) return
    setScanStatus('scanning')
    setScanProgress(0)
    setErrorMessage(null)

    // Animate progress up to 90% while waiting for API response
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
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

      // Get browser timezone offset in ISO8601 format
      const offsetStr = getBrowserTimezoneOffset()
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
    } catch (err) {
      clearInterval(progressInterval)
      setScanStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred during scan.')
    }
  }

  return {
    handleProcessScan,
  }
}
