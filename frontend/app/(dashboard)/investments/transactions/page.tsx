'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/utils/transaction'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Plus, Edit, Trash2, Loader2, Search, Coins } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

interface Transaction {
  id: string
  holding_id: string
  user_id: string
  type: 'buy' | 'sell' | 'dividend' | 'split' | 'merge' | 'transfer_in' | 'transfer_out' | 'fee' | 'interest' | 'staking_reward' | 'airdrop'
  quantity: number
  price: number
  fees: number
  taxes: number
  total_amount: number
  transaction_date: string
  settlement_date: string | null
  notes: string | null
  external_id: string | null
  created_at: string
  updated_at: string
}

interface HoldingWithValue {
  id: string
  accountId: string
  accountName: string
  symbol: string
  name: string
  assetClass: string
  quantity: number
  avgBuyPrice: number | null
  currentPrice: number | null
  currency: string
  marketValue: number
  costBasis: number
  gainLoss: number
  gainLossPct: number
}

const transactionSchema = z.object({
  holdingId: z.string().uuid('Invalid holding ID'),
  type: z.enum([
    'buy', 'sell', 'dividend', 'split', 'merge',
    'transfer_in', 'transfer_out', 'fee', 'interest',
    'staking_reward', 'airdrop'
  ]),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  fees: z.number().min(0).default(0),
  taxes: z.number().min(0).default(0),
  transactionDate: z.string().min(1, 'Transaction date is required'),
  settlementDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
  externalId: z.string().max(100).optional(),
})

type TransactionFormData = z.infer<typeof transactionSchema>

const TYPE_LABELS: Record<string, string> = {
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  split: 'Split',
  merge: 'Merge',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  fee: 'Fee',
  interest: 'Interest',
  staking_reward: 'Staking Reward',
  airdrop: 'Airdrop',
}

const TYPE_COLORS: Record<string, string> = {
  buy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  sell: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  dividend: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  split: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  merge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  transfer_in: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  transfer_out: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  fee: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  interest: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  staking_reward: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  airdrop: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
}

async function fetchHoldings(): Promise<HoldingWithValue[]> {
  const response = await fetch('/api/investments/holdings/all')
  if (!response.ok) throw new Error('Failed to fetch holdings')
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function fetchTransactions(holdingId?: string): Promise<Transaction[]> {
  const url = holdingId
    ? `/api/investments/transactions?holdingId=${holdingId}`
    : '/api/investments/transactions'
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch transactions')
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function createTransaction(data: TransactionFormData): Promise<{ transactionId: string }> {
  const response = await fetch('/api/investments/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function updateTransaction(id: string, data: Partial<TransactionFormData>): Promise<void> {
  const response = await fetch(`/api/investments/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
}

async function deleteTransaction(id: string, holdingId: string): Promise<void> {
  const response = await fetch(`/api/investments/transactions/${id}?holdingId=${holdingId}`, {
    method: 'DELETE',
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
}

export default function InvestmentsTransactionsPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [selectedHoldingId, setSelectedHoldingId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: holdings, isLoading: holdingsLoading } = useQuery({
    queryKey: ['investment-holdings-all'],
    queryFn: fetchHoldings,
  })

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['investment-transactions', selectedHoldingId],
    queryFn: () => fetchTransactions(selectedHoldingId || undefined),
    enabled: true,
  })

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['investment-holdings-all'] })
      queryClient.invalidateQueries({ queryKey: ['investment-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['investment-overview'] })
      toast.success('Transaction created')
      setIsCreateOpen(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransactionFormData> }) => updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['investment-holdings-all'] })
      queryClient.invalidateQueries({ queryKey: ['investment-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['investment-overview'] })
      toast.success('Transaction updated')
      setEditingTransaction(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, holdingId }: { id: string; holdingId: string }) => deleteTransaction(id, holdingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['investment-holdings-all'] })
      queryClient.invalidateQueries({ queryKey: ['investment-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['investment-overview'] })
      toast.success('Transaction deleted')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleCreateSubmit = async (data: TransactionFormData): Promise<void> => {
    createMutation.mutate(data)
  }

  const handleUpdateSubmit = async (data: Partial<TransactionFormData>): Promise<void> => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data })
    }
  }

  const handleDelete = (id: string, holdingId: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      deleteMutation.mutate({ id, holdingId })
    }
  }

  const filteredTransactions = transactions?.filter(t => {
    const matchesSearch = t.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || t.type === typeFilter
    return matchesSearch && matchesType
  }) || []

  const sortedTransactions = [...filteredTransactions].sort((a, b) =>
    new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">View and manage your investment transactions</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={holdingsLoading || !holdings?.length}>
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
            </DialogHeader>
            <TransactionForm
              holdings={holdings || []}
              onSubmit={handleCreateSubmit}
              isLoading={createMutation.isPending}
              defaultHoldingId={selectedHoldingId}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <Label htmlFor="holding-filter" className="text-sm font-medium">Holding:</Label>
              <Select
                value={selectedHoldingId}
                onValueChange={setSelectedHoldingId}
                disabled={holdingsLoading}
              >
                <SelectTrigger id="holding-filter" className="w-[300px]">
                  <SelectValue placeholder="All holdings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Holdings</SelectItem>
                  {holdings?.map(h => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.symbol} - {h.name} ({h.accountName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Label htmlFor="type-filter" className="text-sm font-medium">Type:</Label>
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger id="type-filter" className="w-[180px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {transactionsLoading ? (
        <Card>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : sortedTransactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Coins className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No transactions found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || typeFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first transaction to get started'}
            </p>
            {!searchQuery && typeFilter === 'all' && (
              <Button onClick={() => setIsCreateOpen(true)} disabled={createMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Transactions ({sortedTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Holding</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((transaction, index) => (
                  <TransactionTableRow
                    key={transaction.id}
                    transaction={transaction}
                    rank={index + 1}
                    onEdit={() => setEditingTransaction(transaction)}
                    onDelete={() => handleDelete(transaction.id, transaction.holding_id)}
                    isDeleting={deleteMutation.isPending}
                    typeColors={TYPE_COLORS}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {editingTransaction && (
        <Dialog open={!!editingTransaction} onOpenChange={open => !open && setEditingTransaction(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
            </DialogHeader>
            <TransactionForm
              holdings={holdings || []}
              initialData={editingTransaction}
              onSubmit={handleUpdateSubmit}
              isLoading={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function TransactionTableRow({
  transaction,
  rank,
  onEdit,
  onDelete,
  isDeleting,
  typeColors,
}: {
  transaction: Transaction
  rank: number
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
  typeColors: Record<string, string>
}) {
  const isPositive = ['buy', 'transfer_in', 'dividend', 'interest', 'staking_reward', 'airdrop'].includes(transaction.type)
  const isNegative = ['sell', 'transfer_out', 'fee'].includes(transaction.type)

  return (
    <TableRow className="hover:bg-accent/50">
      <TableCell className="font-mono text-sm">
        {format(new Date(transaction.transaction_date), 'dd MMM yyyy')}
      </TableCell>
      <TableCell>
        <div className="font-medium">{transaction.holding_id.slice(0, 8)}...</div>
      </TableCell>
      <TableCell className="text-center">
        <Badge className={cn(TYPE_COLORS[transaction.type] || TYPE_COLORS.buy)}>
          {TYPE_LABELS[transaction.type] || transaction.type}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">{transaction.quantity.toLocaleString()}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(transaction.price)}</TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {transaction.fees > 0 ? formatCurrency(transaction.fees) : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums font-medium">
        {isPositive ? '+' : isNegative ? '-' : ''}{formatCurrency(transaction.total_amount)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} disabled={isDeleting} className="h-7 w-7 text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function TransactionForm({
  holdings,
  initialData,
  onSubmit,
  isLoading,
  defaultHoldingId,
}: {
  holdings: HoldingWithValue[]
  initialData?: Transaction
  onSubmit: (data: TransactionFormData) => Promise<void>
  isLoading: boolean
  defaultHoldingId?: string
}) {
  const [today] = useState(() => new Date().toISOString().split('T')[0])
  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: initialData
      ? {
          holdingId: initialData.holding_id,
          type: initialData.type,
          quantity: initialData.quantity,
          price: initialData.price,
          fees: initialData.fees,
          taxes: initialData.taxes,
          transactionDate: initialData.transaction_date.split('T')[0],
          settlementDate: initialData.settlement_date?.split('T')[0] || '',
          notes: initialData.notes || '',
          externalId: initialData.external_id || '',
        }
      : {
          holdingId: defaultHoldingId || holdings[0]?.id || '',
          type: 'buy',
          quantity: 1,
          price: 0,
          fees: 0,
          taxes: 0,
          transactionDate: today,
          settlementDate: '',
          notes: '',
          externalId: '',
        },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="holdingId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Holding</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!initialData}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select holding" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {holdings.map(h => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.symbol} - {h.name} ({h.accountName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transaction Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input type="number" step="0.00000001" min="0.00000001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price per Unit</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="fees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fees</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="taxes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taxes</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="transactionDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transaction Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
<FormField
            control={form.control}
            name="settlementDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Settlement Date (Optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Additional notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="externalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>External ID (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Broker transaction ID" />
              </FormControl>
              <FormDescription>Used for deduplication when importing from broker</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => form.reset()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {initialData ? 'Update' : 'Create'} Transaction
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}