import { getCashFlow } from '@/features/cash-flow/actions/cash_flow'
import { CashFlowForm } from '@/features/cash-flow/components/CashFlowForm'
import { ScanDialog } from '@/features/receipts/components/ScanDialog'

export default async function AddTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string, scan?: string }>
}) {
  const { edit, scan } = await searchParams

  let initialData = null
  if (edit) {
    const cashFlows = await getCashFlow()
    initialData = cashFlows.find((t) => t.id === edit) || null
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">
          {edit ? "Edit Arus Kas" : scan ? "Pindai Dokumen" : "Entri Arus Kas Manual"}
        </h1>
      </div>

      <div className="grid gap-6 grid-cols-1">
        {scan ? (
          <ScanDialog scanContext={scan as 'BankStatement' | 'Receipt'} />
        ) : (
          <CashFlowForm initialData={initialData} />
        )}
      </div>
    </>
  )
}
