'use client'

import { format } from "date-fns"
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
import { useQueryState } from 'nuqs'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit2, Trash2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { deleteTransaction } from "@/lib/actions/transactions"
import { Tables } from "@/lib/database.types"

import { formatCurrency, filterTransactionsByRange } from "@/lib/utils/transaction"

export function TransactionList({ transactions, dateFilter: propDateFilter, timeRange }: { transactions: Tables<'transactions'>[], dateFilter?: string, timeRange: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [dateFilter, setDateFilter] = useQueryState('date', {
    shallow: false,
  })

  // Local state for optimistic updates
  const [localTransactions, setLocalTransactions] = useState<Tables<'transactions'>[]>(transactions)

  // Keep local state in sync when server validation triggers fresh props
  useEffect(() => {
    setLocalTransactions(transactions)
  }, [transactions])

  const handleClearDateFilter = () => {
    setDateFilter(null)
  }

  const handleDelete = async (id: string) => {
    const previousTransactions = [...localTransactions]
    // Optimistically remove from UI
    setLocalTransactions(prev => prev.filter(tx => tx.id !== id))

    const result = await deleteTransaction(id)
    if (!result.success) {
      alert(`Failed to delete transaction: ${result.error}`)
      setLocalTransactions(previousTransactions)
    }
  }

  const handleEdit = (id: string) => {
    router.push(`/add?edit=${id}`)
  }

  const timeFilteredTransactions = useMemo(() => {
    return filterTransactionsByRange(localTransactions, timeRange)
  }, [localTransactions, timeRange])

  const filteredTransactions = useMemo(() => {
    return timeFilteredTransactions.filter(tx => {
      if (dateFilter && tx.date !== dateFilter) return false
      return true
    })
  }, [timeFilteredTransactions, dateFilter])

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl bg-white relative">
      <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm font-bold text-slate-800">Recent Transactions</CardTitle>
          {dateFilter && (
            <button onClick={handleClearDateFilter} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1">
              Filtering: {dateFilter} <span>✕</span>
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <Table className="w-full text-left">
            <TableHeader className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
              <TableRow>
                <TableHead className="px-6 py-3 font-bold text-slate-400 w-32">Date</TableHead>
                <TableHead className="px-6 py-3 font-bold text-slate-400">Transaction / Category</TableHead>
                <TableHead className="px-6 py-3 text-right font-bold text-slate-400">Amount</TableHead>
                <TableHead className="px-6 py-3 text-right font-bold text-slate-400 w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 text-sm">
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500 h-32">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="w-8 h-8 text-slate-200" />
                      <p>No transactions found for this period.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell className="px-6 py-4 text-slate-500 whitespace-nowrap align-top">{format(new Date(tx.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="px-6 py-4 font-medium text-slate-900 min-w-[300px] max-w-md">
                      <span className="block mb-1 group-hover:text-indigo-600 transition-colors break-words leading-relaxed">{tx.note || "General Transaction"}</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 border border-slate-200 font-bold uppercase tracking-tight">{tx.category}</span>
                        {tx.paymentMethod && <span className="text-[10px] text-slate-400 font-medium">{tx.paymentMethod}</span>}
                      </div>
                      {tx.change !== null && tx.change !== undefined && tx.change > 0 && <span className="block text-[10px] text-slate-400 font-normal mt-1 italic">Calculated change: {formatCurrency(tx.change)}</span>}
                    </TableCell>
                    <TableCell className={cn("px-6 py-4 text-right font-bold whitespace-nowrap align-top", tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount).replace("Rp", "Rp ")}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right whitespace-nowrap align-top">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(tx.id)} className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-slate-100">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)} className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
