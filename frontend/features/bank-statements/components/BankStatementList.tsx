'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGroupedBankStatements, getFileUrl, deleteBankStatement, updateStatementItem, deleteStatementItem, addStatementItem } from '@/features/bank-statements/actions/statements'
import type { Tables } from '@/lib/database.types'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
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
  const [activeMobileItem, setActiveMobileItem] = useState<{ statementId: string; item: Tables<'bank_statement_items'> } | null>(null)

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
      <div className="flex justify-center items-center p-12" role="status" aria-label="Memuat daftar mutasi bank">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" aria-hidden="true" />
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
        <section key={bank} aria-label={`Grup Bank ${bank}`} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
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
                <article key={statement.id} className="bg-white">
                  <div
                    onClick={() => togglePeriod(statement.id)}
                    aria-expanded={expandedPeriods.includes(statement.id)}
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-50/50 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      <span className="text-sm font-semibold text-slate-700">{statement.statement_period}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        aria-label={`Hapus laporan mutasi ${statement.statement_period}`}
                        onClick={(e) => handleDeleteStatement(e, statement.id, statement.file_path)}
                        disabled={deleteMutation.isPending && deleteMutation.variables?.id === statement.id}
                      >
                        {deleteMutation.isPending && deleteMutation.variables?.id === statement.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
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
                        <FileText className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                        View PDF
                      </Button>
                      {expandedPeriods.includes(statement.id) ? <ChevronDown className="w-4 h-4 text-slate-300" aria-hidden="true" /> : <ChevronRight className="w-4 h-4 text-slate-300" aria-hidden="true" />}
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

                      {/* Desktop Table View */}
                      <div className="hidden md:block rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2">Date</th>
                              <th className="px-4 py-2">Description</th>
                              <th className="px-4 py-2 text-right">Amount</th>
                              <th className="px-4 py-2 text-right">Balance</th>
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
                                <td className="px-4 py-2.5 text-right whitespace-nowrap font-mono font-medium text-slate-600">
                                  {item.balance !== null && item.balance !== undefined ? (
                                    `Rp ${Number(item.balance).toLocaleString('id-ID')}`
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                                      aria-label={`Edit item ${item.description}`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingItem({ statementId: statement.id, item })
                                      }}
                                    >
                                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                                      aria-label={`Hapus item ${item.description}`}
                                      onClick={(e) => handleDeleteItem(e, item.id)}
                                      disabled={deleteItemMutation.isPending}
                                    >
                                      {deleteItemMutation.isPending ? (
                                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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

                      {/* Mobile Card List View */}
                      <div className="md:hidden space-y-3">
                        {statement.bank_statement_items.map((item) => (
                          <div 
                            key={item.id} 
                            className="bg-white rounded-lg border border-slate-200 p-3.5 space-y-2 shadow-none hover:border-indigo-100 hover:bg-slate-50/30 transition-all cursor-pointer active:scale-[0.99]"
                            onClick={() => setActiveMobileItem({ statementId: statement.id, item })}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <p className="text-[10px] font-bold text-slate-500">
                                  {new Date(item.date).toLocaleString('id-ID', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                <p className="font-bold text-slate-800 text-xs mt-1 leading-normal break-words">
                                  {item.description}
                                </p>
                                {item.category && (
                                  <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={`flex items-center justify-end gap-0.5 font-mono font-bold text-xs ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {item.type === 'income' ? <ArrowDownLeft className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                                  Rp {item.amount.toLocaleString('id-ID')}
                                </div>
                                {item.balance !== null && item.balance !== undefined && (
                                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                    Saldo: Rp {Number(item.balance).toLocaleString('id-ID')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold flex items-center justify-center gap-1.5 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAddingToStatement(statement.id)
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Item
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
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
          balance: editingItem.item.balance !== null && editingItem.item.balance !== undefined ? Number(editingItem.item.balance) : undefined,
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

    {/* Mobile Action Drawer Dialog */}
    <Dialog open={!!activeMobileItem} onOpenChange={(open) => { if (!open) setActiveMobileItem(null) }}>
      <DialogContent 
        showCloseButton={false}
        className="fixed bottom-0 top-auto left-0 right-0 translate-y-0 translate-x-0 w-full max-w-full rounded-t-2xl rounded-b-none border-t border-slate-200 p-6 gap-4 bg-white pb-8 focus:outline-none focus-visible:ring-0 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-full data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-full duration-200 ease-out"
      >
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-2" />
        <DialogHeader className="text-left">
          <DialogTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Kelola Item Mutasi
          </DialogTitle>
          <DialogDescription className="text-slate-900 font-bold text-base mt-1.5 leading-relaxed">
            {activeMobileItem?.item.description || "Tanpa Deskripsi"}
          </DialogDescription>
        </DialogHeader>

        {activeMobileItem && (
          <div className="space-y-4 my-2">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Nominal Mutasi</span>
              <span className={`font-bold font-mono text-base ${activeMobileItem.item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {activeMobileItem.item.type === 'income' ? "+" : "-"} Rp {activeMobileItem.item.amount.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-tight">Kategori</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{activeMobileItem.item.category || "-"}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-tight">Tanggal</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {new Date(activeMobileItem.item.date).toLocaleString('id-ID', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 flex items-center justify-center gap-2 rounded-xl"
            onClick={() => {
              if (activeMobileItem) {
                setEditingItem({ statementId: activeMobileItem.statementId, item: activeMobileItem.item })
                setActiveMobileItem(null)
              }
            }}
          >
            <Pencil className="w-4 h-4" /> Edit Item
          </Button>
          <Button
            variant="outline"
            className="w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-bold h-11 flex items-center justify-center gap-2 rounded-xl"
            onClick={async (e) => {
              if (activeMobileItem && confirm('Delete this transaction item?')) {
                await deleteItemMutation.mutateAsync(activeMobileItem.item.id)
                setActiveMobileItem(null)
              }
            }}
          >
            <Trash2 className="w-4 h-4" /> Hapus Item
          </Button>
          <Button
            variant="ghost"
            className="w-full text-slate-500 hover:bg-slate-100 font-bold h-11 rounded-xl"
            onClick={() => setActiveMobileItem(null)}
          >
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
)
}
