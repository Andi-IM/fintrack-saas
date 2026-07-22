import { useState } from 'react'
import { reparseBankStatementWithAI } from '@/features/receipts/actions/ocr'
import { useScanStore } from '@/features/receipts/hooks/use-scan-store'
import { getBrowserTimezoneOffset } from '@/lib/utils/date'

export function useBankStatementRescan() {
  const [isRescanning, setIsRescanning] = useState(false)
  const {
    fileToScan,
    scanResult,
    setScanResult,
    setErrorMessage,
  } = useScanStore()

  const handleReparseBankStatement = async () => {
    const rawText = scanResult?.rawText
    if (!scanResult || !rawText) {
      setErrorMessage('Raw OCR text is unavailable. Upload the statement again before re-scanning.')
      return
    }

    setIsRescanning(true)
    setErrorMessage(null)

    try {
      const result = await reparseBankStatementWithAI({
        rawText,
        currentResult: scanResult,
        timezoneOffset: getBrowserTimezoneOffset(),
        filename: fileToScan?.name,
      })

      if (result.success) {
        setScanResult({ ...result.data, rawText })
      } else {
        setErrorMessage(result.error)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to re-scan bank statement.')
    } finally {
      setIsRescanning(false)
    }
  }

  return {
    handleReparseBankStatement,
    isRescanning,
    canReparseBankStatement: Boolean(scanResult?.rawText),
  }
}
