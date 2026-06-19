import { useRouter } from 'next/navigation'
import { useScanStore } from '@/features/receipts/hooks/use-scan-store'
import { saveReceipt } from '@/features/receipts/actions/receipts'
import { saveBankStatement } from '@/features/bank-statements/actions/statements'
import { mapReceiptResultToPayload, mapBankStatementResultToPayload } from '../utils/scan-mapper'

export function useSubmitScannedData(scanContext: 'Receipt' | 'BankStatement') {
  const router = useRouter()
  const {
    fileToScan,
    scanResult,
    setScanStatus,
    setErrorMessage,
    resetScan,
  } = useScanStore()

  const handleSaveScannedItems = async () => {
    if (!scanResult || !fileToScan) return
    setScanStatus('scanning') // Use scanning as loading state for save

    try {
      if (scanContext === 'Receipt') {
        const payload = mapReceiptResultToPayload(scanResult, fileToScan)
        const result = await saveReceipt(payload)
        if (!result.success) {
          setScanStatus('error')
          setErrorMessage(result.error)
          return
        }
      } else if (scanContext === 'BankStatement') {
        const payload = mapBankStatementResultToPayload(scanResult, fileToScan)
        const result = await saveBankStatement(payload)
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

  return {
    handleSaveScannedItems,
  }
}
