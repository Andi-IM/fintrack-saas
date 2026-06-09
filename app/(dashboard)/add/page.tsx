import { getTransactions } from '@/lib/actions/transactions'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { ScanDialog } from '@/components/transactions/ScanDialog'

export default async function AddTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string, scan?: string }>
}) {
  const { edit, scan } = await searchParams
  
  let initialData = null
  if (edit) {
    const transactions = await getTransactions()
    initialData = transactions.find((t: any) => t.id === edit) || null
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">
          {edit ? "Edit Transaction" : "Transactions"}
        </h1>
      </div>
      
      <div className={["grid gap-6", scan === "Receipt" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"].join(" ")}>
        {scan && (
          <ScanDialog scanContext={scan as 'Receipt' | 'BankStatement'} />
        )}

        <TransactionForm initialData={initialData} />
      </div>
    </>
  )
}
