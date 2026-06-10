'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGroupedBankStatements, getFileUrl, deleteBankStatement, updateStatementItem, deleteStatementItem, addStatementItem } from '@/lib/actions/statements'
import type { Tables } from '@/lib/database.types'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  Calendar, 
  FileText, 
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Trash2,
  Pencil,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import ItemEditDialog from '@/components/statements/ItemEditDialog'
import type { ItemFormData } from '@/components/statements/ItemEditDialog'

function formatDateForInput(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function BankStatementList() {
  const queryClient = useQueryClient()
  const [expandedBanks, setExpandedBanks] = useState<string[]>([])
  const [expandedPeriods, setExpandedPeriods] = useState<string[]>([])
  const [editingItem, setEditingItem] = useState<{ statementId: string; item: Tables<'bank_statement_items'> } | null>(null)
  const [addingToStatement, setAddingToStatement] = useState<string | null>(null)

  const queryOptions = {
    queryKey: ['bank-statements'] as const,
    queryFn: async () => {
      const result = await getGroupedBankStatements()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data ?? {}
    },
  }

  const { data: groupedData, isLoading: loading } = useQuery({
    ...queryOptions,
    queryFn: async () => {
      const result = await getGroupedBankStatements()
      if (!result.success) throw new Error(result.error)
      const data = result.data ?? {}
      if (Object.keys(data).length > 0 && expandedBanks.length === 0) {
        setExpandedBanks([Object.keys(data)[0]])
      }
      return data
    },
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['bank-statements'] })
    queryClient.invalidateQueries({ queryKey: ['bank-statement-analytics'] })
  }

  const deleteMutation = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      const result = await deleteBankStatement(id, filePath)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: invalidateAll,
    onError: (err) => {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete statement')
    }
  })

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: ItemFormData }) => {
      const result = await updateStatementItem(itemId, data)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: invalidateAll,
    onError: (err) => {
      alert(err instanceof Error ? err.message : 'Failed to update item')
    }
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const result = await deleteStatementItem(itemId)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: invalidateAll,
    onError: (err) => {
      alert(err instanceof Error ? err.message : 'Failed to delete item')
    }
  })

  const addItemMutation = useMutation({
    mutationFn: async ({ statementId, data }: { statementId: string; data: ItemFormData }) => {
      const result = await addStatementItem(statementId, data)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: invalidateAll,
    onError: (err) => {
      alert(err instanceof Error ? err.message : 'Failed to add item')
    }
  })

  const handleDeleteStatement = async (e: React.MouseEvent, id: string, filePath: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this statement and all its items? This will also remove the uploaded file.')) return
    deleteMutation.mutate({ id, filePath })
  }

  const handleDeleteItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    if (!confirm('Delete this transaction item?')) return
    deleteItemMutation.mutate(itemId)
  }

  const toggleBank = (bank: string) => {
    setExpandedBanks(prev => 
      prev.includes(bank) ? prev.filter(b => b !== bank) : [...prev, bank]
    )
  }

  const togglePeriod = (id: string) => {
    setExpandedPeriods(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleViewFile = async (path: string) => {
    const result = await getFileUrl(path)
    if (result.success) {
      window.open(result.data, '_blank')
    } else {
      alert(result.error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!groupedData || Object.keys(groupedData).length === 0) {
    return (
      <Card className="border-dashed border-slate-200">
        <CardContent className="p-8 text-center text-slate-500">
          No bank statements found. Upload one to get started.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <div className="space-y-4">
      {Object.entries(groupedData).map(([bank, statements]) => (
        <div key={bank} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          {/* Bank Header */}
          <button 
            onClick={() => toggleBank(bank)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors bg-slate-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">{bank}</h3>
              <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {statements.length} Statements
              </span>
            </div>
            {expandedBanks.includes(bank) ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </button>

          {/* Periods List */}
          {expandedBanks.includes(bank) && (
            <div className="divide-y divide-slate-100">
              {statements.map((statement) => (
                <div key={statement.id} className="bg-white">
                  <div 
                    onClick={() => togglePeriod(statement.id)}
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">{statement.statement_period}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        onClick={(e) => handleDeleteStatement(e, statement.id, statement.file_path)}
                        disabled={deleteMutation.isPending && deleteMutation.variables?.id === statement.id}
                      >
                        {deleteMutation.isPending && deleteMutation.variables?.id === statement.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewFile(statement.file_path)
                        }}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        View PDF
                      </Button>
                      {expandedPeriods.includes(statement.id) ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                    </div>
                  </div>

                  {/* Transaction Details */}
                  {expandedPeriods.includes(statement.id) && (
                    <div className="px-6 pb-4 bg-slate-50/30">
                      {/* Balance Summary Card */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Awal</p>
                          <p className="text-sm font-bold text-slate-700 font-mono">
                            Rp {(statement.opening_balance || 0).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Akhir</p>
                          <p className="text-sm font-bold text-indigo-600 font-mono">
                            Rp {(statement.closing_balance || 0).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2">Date</th>
                              <th className="px-4 py-2">Description</th>
                              <th className="px-4 py-2 text-right">Amount</th>
                              <th className="px-4 py-2 text-right w-16">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {statement.bank_statement_items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                                  {new Date(item.date).toLocaleString('id-ID', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="px-4 py-2.5">
                                  <p className="font-bold text-slate-700 line-clamp-1">{item.description}</p>
                                  <p className="text-[10px] text-slate-400">{item.category}</p>
                                </td>
                                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                  <div className={`flex items-center justify-end gap-1 font-mono font-bold ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {item.type === 'income' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                    Rp {item.amount.toLocaleString('id-ID')}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingItem({ statementId: statement.id, item })
                                      }}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                      onClick={(e) => handleDeleteItem(e, item.id)}
                                      disabled={deleteItemMutation.isPending}
                                    >
                                      {deleteItemMutation.isPending ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAddingToStatement(statement.id)
                            }}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Add Item
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>

    {/* Edit Item Dialog */}
    {editingItem && (
      <ItemEditDialog
        open={!!editingItem}
        onOpenChange={(open) => { if (!open) setEditingItem(null) }}
        title="Edit Transaction Item"
        initialData={{
          date: formatDateForInput(editingItem.item.date),
          description: editingItem.item.description,
          amount: editingItem.item.amount,
          type: editingItem.item.type as 'income' | 'expense',
          category: editingItem.item.category || '',
        }}
        onSave={async (data) => {
          await updateItemMutation.mutateAsync({ itemId: editingItem.item.id, data })
        }}
      />
    )}

    {/* Add Item Dialog */}
    {addingToStatement && (
      <ItemEditDialog
        open={!!addingToStatement}
        onOpenChange={(open) => { if (!open) setAddingToStatement(null) }}
        title="Add Transaction Item"
        onSave={async (data) => {
          await addItemMutation.mutateAsync({ statementId: addingToStatement, data })
        }}
      />
    )}
    </>
)
}
