import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getGroupedBankStatements,
  getFileUrl,
  deleteBankStatement,
  updateStatementItem,
  deleteStatementItem,
  addStatementItem,
} from '@/features/bank-statements/actions/statements'
import type { Tables } from '@/lib/database.types'
import type { ItemFormData } from '@/components/statements/ItemEditDialog'

export type { ItemFormData }

export interface UseBankStatementsReturn {
  groupedData: Record<string, import('@/features/bank-statements/actions/statements').BankStatementWithItems[]> | undefined
  loading: boolean
  expandedBanks: string[]
  expandedPeriods: string[]
  editingItem: { statementId: string; item: Tables<'bank_statement_items'> } | null
  addingToStatement: string | null
  activeMobileItem: { statementId: string; item: Tables<'bank_statement_items'> } | null
  deleteMutation: ReturnType<typeof useMutation<void, Error, { id: string; filePath: string }>>
  updateItemMutation: ReturnType<typeof useMutation<void, Error, { itemId: string; data: ItemFormData }>>
  deleteItemMutation: ReturnType<typeof useMutation<void, Error, string>>
  addItemMutation: ReturnType<typeof useMutation<void, Error, { statementId: string; data: ItemFormData }>>
  toggleBank: (bank: string) => void
  togglePeriod: (id: string) => void
  setEditingItem: (value: { statementId: string; item: Tables<'bank_statement_items'> } | null) => void
  setAddingToStatement: (value: string | null) => void
  setActiveMobileItem: (value: { statementId: string; item: Tables<'bank_statement_items'> } | null) => void
  handleDeleteStatement: (e: React.MouseEvent, id: string, filePath: string) => void
  handleDeleteItem: (e: React.MouseEvent, itemId: string) => void
  handleViewFile: (path: string) => Promise<void>
}

export function useBankStatements(): UseBankStatementsReturn {
  const queryClient = useQueryClient()
  const [expandedBanks, setExpandedBanks] = useState<string[]>([])
  const [expandedPeriods, setExpandedPeriods] = useState<string[]>([])
  const [editingItem, setEditingItem] = useState<{ statementId: string; item: Tables<'bank_statement_items'> } | null>(null)
  const [addingToStatement, setAddingToStatement] = useState<string | null>(null)
  const [activeMobileItem, setActiveMobileItem] = useState<{ statementId: string; item: Tables<'bank_statement_items'> } | null>(null)

  const { data: groupedData, isLoading: loading } = useQuery({
    queryKey: ['bank-statements'] as const,
    queryFn: async () => {
      const result = await getGroupedBankStatements()
      if (!result.success) throw new Error(result.error)
      return result.data ?? {}
    },
  })

  // Auto-expand first bank group once data loads
  useEffect(() => {
    if (groupedData && Object.keys(groupedData).length > 0 && expandedBanks.length === 0) {
      setExpandedBanks([Object.keys(groupedData)[0]])
    }
  }, [groupedData])

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
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: ItemFormData }) => {
      const result = await updateStatementItem(itemId, data)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: invalidateAll,
    onError: (err) => {
      alert(err instanceof Error ? err.message : 'Failed to update item')
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const result = await deleteStatementItem(itemId)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: invalidateAll,
    onError: (err) => {
      alert(err instanceof Error ? err.message : 'Failed to delete item')
    },
  })

  const addItemMutation = useMutation({
    mutationFn: async ({ statementId, data }: { statementId: string; data: ItemFormData }) => {
      const result = await addStatementItem(statementId, data)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: invalidateAll,
    onError: (err) => {
      alert(err instanceof Error ? err.message : 'Failed to add item')
    },
  })

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

  const handleDeleteStatement = (e: React.MouseEvent, id: string, filePath: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this statement and all its items? This will also remove the uploaded file.')) return
    deleteMutation.mutate({ id, filePath })
  }

  const handleDeleteItem = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    if (!confirm('Delete this transaction item?')) return
    deleteItemMutation.mutate(itemId)
  }

  const handleViewFile = async (path: string) => {
    const result = await getFileUrl(path)
    if (result.success) {
      window.open(result.data, '_blank')
    } else {
      alert(result.error)
    }
  }

  return {
    groupedData,
    loading,
    expandedBanks,
    expandedPeriods,
    editingItem,
    addingToStatement,
    activeMobileItem,
    deleteMutation,
    updateItemMutation,
    deleteItemMutation,
    addItemMutation,
    toggleBank,
    togglePeriod,
    setEditingItem,
    setAddingToStatement,
    setActiveMobileItem,
    handleDeleteStatement,
    handleDeleteItem,
    handleViewFile,
  }
}
