'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/utils/transaction'
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
import { Plus, Edit, Trash2, Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

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

interface AccountWithHoldings {
  id: string
  name: string
  type: string
  broker: string | null
  currency: string
  totalValue: number
  totalCost: number
  gainLoss: number
  gainLossPct: number
  holdingsCount: number
  holdings: HoldingWithValue[]
}

const holdingSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  symbol: z.string().min(1, 'Symbol is required').max(20).toUpperCase(),
  name: z.string().min(1, 'Name is required').max(200),
  assetClass: z.enum(['equity', 'fixed_income', 'crypto', 'commodity', 'cash', 'other']),
  quantity: z.number().positive('Quantity must be positive'),
  avgBuyPrice: z.number().positive('Average buy price must be positive').optional(),
  currency: z.string().length(3).default('IDR'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

type HoldingFormData = z.infer<typeof holdingSchema>

async function fetchAccounts(): Promise<AccountWithHoldings[]> {
  const response = await fetch('/api/investments/accounts')
  if (!response.ok) throw new Error('Failed to fetch accounts')
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function fetchAccountWithHoldings(accountId: string): Promise<AccountWithHoldings> {
  const response = await fetch(`/api/investments/accounts/${accountId}`)
  if (!response.ok) throw new Error('Failed to fetch account')
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function createHolding(data: HoldingFormData): Promise<{ holdingId: string }> {
  const response = await fetch('/api/investments/holdings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function updateHolding(id: string, data: Partial<HoldingFormData>): Promise<void> {
  const response = await fetch(`/api/investments/holdings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
}

async function deleteHolding(id: string): Promise<void> {
  const response = await fetch(`/api/investments/holdings/${id}`, {
    method: 'DELETE',
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
}

export default function InvestmentsHoldingsPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingHolding, setEditingHolding] = useState<HoldingWithValue | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['investment-accounts'],
    queryFn: fetchAccounts,
  })

  const { data: selectedAccount, isLoading: holdingsLoading } = useQuery({
    queryKey: ['investment-account-holdings', selectedAccountId],
    queryFn: () => fetchAccountWithHoldings(selectedAccountId!),
    enabled: !!selectedAccountId,
  })

  const createMutation = useMutation({
    mutationFn: createHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-account-holdings', selectedAccountId] })
      queryClient.invalidateQueries({ queryKey: ['investment-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['investment-overview'] })
      toast.success('Holding created')
      setIsCreateOpen(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HoldingFormData> }) => updateHolding(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-account-holdings', selectedAccountId] })
      queryClient.invalidateQueries({ queryKey: ['investment-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['investment-overview'] })
      toast.success('Holding updated')
      setEditingHolding(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-account-holdings', selectedAccountId] })
      queryClient.invalidateQueries({ queryKey: ['investment-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['investment-overview'] })
      toast.success('Holding deleted')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleCreateSubmit = async (data: HoldingFormData): Promise<void> => {
    createMutation.mutate(data)
  }

  const handleUpdateSubmit = async (data: Partial<HoldingFormData>): Promise<void> => {
    if (editingHolding) {
      updateMutation.mutate({ id: editingHolding.id, data })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this holding?')) {
      deleteMutation.mutate(id)
    }
  }

  const filteredHoldings = selectedAccount?.holdings?.filter(h =>
    h.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Holdings</h1>
          <p className="text-muted-foreground">View and manage your investment holdings</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedAccountId}>
              <Plus className="w-4 h-4 mr-2" />
              Add Holding
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Holding</DialogTitle>
            </DialogHeader>
            <HoldingForm
              accounts={accounts || []}
              onSubmit={handleCreateSubmit}
              isLoading={createMutation.isPending}
              defaultAccountId={selectedAccountId}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Account Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <Label htmlFor="account-select" className="text-sm font-medium">Account:</Label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                disabled={accountsLoading}
              >
                <SelectTrigger id="account-select" className="w-62.5">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAccount && (
                <Badge variant="secondary" className="gap-1">
                  {selectedAccount.holdingsCount} holdings
                  <span className={cn(
                    'font-medium',
                    selectedAccount.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {selectedAccount.gainLoss >= 0 ? '+' : ''}{selectedAccount.gainLossPct.toFixed(2)}%
                  </span>
                </Badge>
              )}
            </div>
            {selectedAccount && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search holdings..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {accountsLoading ? (
        <Card>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : !selectedAccountId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ChevronDown className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Select an account to view holdings</h3>
            <p className="text-muted-foreground">Choose an investment account from the dropdown above</p>
          </CardContent>
        </Card>
      ) : holdingsLoading ? (
        <Card>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredHoldings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ChevronUp className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No holdings found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Add your first holding to this account'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateOpen(true)} disabled={createMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Add Holding
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedAccount?.name} Holdings ({filteredHoldings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Asset Class</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg Price</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">Gain/Loss</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHoldings.map((holding, index) => (
                  <HoldingTableRow
                    key={holding.id}
                    holding={holding}
                    rank={index + 1}
                    onEdit={() => setEditingHolding(holding)}
                    onDelete={() => handleDelete(holding.id)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {editingHolding && (
        <Dialog open={!!editingHolding} onOpenChange={open => !open && setEditingHolding(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Holding</DialogTitle>
            </DialogHeader>
            <HoldingForm
              accounts={accounts || []}
              initialData={editingHolding}
              onSubmit={handleUpdateSubmit}
              isLoading={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

const TYPE_COLORS: Record<string, string> = {
  equity: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  fixed_income: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  crypto: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  commodity: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  cash: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  other: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
}

function HoldingTableRow({
  holding,
  rank,
  onEdit,
  onDelete,
  isDeleting,
}: {
  holding: HoldingWithValue
  rank: number
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const isPositive = holding.gainLoss >= 0

  return (
    <TableRow className="hover:bg-accent/50">
      <TableCell className="font-medium">{holding.symbol}</TableCell>
      <TableCell>
        <div>{holding.name}</div>
        <div className="text-xs text-muted-foreground">{holding.accountName}</div>
      </TableCell>
      <TableCell className="text-center">
        <Badge className={cn(TYPE_COLORS[holding.assetClass] || TYPE_COLORS.other)}>
          {holding.assetClass.replace('_', ' ')}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">{holding.quantity.toLocaleString()}</TableCell>
      <TableCell className="text-right tabular-nums">
        {holding.avgBuyPrice ? formatCurrency(holding.avgBuyPrice) : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {holding.currentPrice ? formatCurrency(holding.currentPrice) : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums font-medium">
        {formatCurrency(holding.marketValue)}
      </TableCell>
      <TableCell className={`text-right tabular-nums ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? '+' : ''}{formatCurrency(holding.gainLoss)}
      </TableCell>
      <TableCell className={`text-right tabular-nums font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? '+' : ''}{holding.gainLossPct.toFixed(2)}%
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

function HoldingForm({
  accounts,
  initialData,
  onSubmit,
  isLoading,
  defaultAccountId,
}: {
  accounts: AccountWithHoldings[]
  initialData?: HoldingWithValue
  onSubmit: (data: HoldingFormData) => Promise<void>
  isLoading: boolean
  defaultAccountId?: string
}) {
  const form = useForm<HoldingFormData>({
    resolver: zodResolver(holdingSchema) as any,
    defaultValues: initialData
      ? {
          accountId: initialData.accountId,
          symbol: initialData.symbol,
          name: initialData.name,
          assetClass: initialData.assetClass as HoldingFormData['assetClass'],
          quantity: initialData.quantity,
          avgBuyPrice: initialData.avgBuyPrice ?? undefined,
          currency: initialData.currency,
          metadata: undefined,
        }
      : {
          accountId: defaultAccountId || accounts[0]?.id || '',
          symbol: '',
          name: '',
          assetClass: 'equity' as const,
          quantity: 1,
          avgBuyPrice: undefined,
          currency: 'IDR' as const,
          metadata: undefined,
        },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
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
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Symbol</FormLabel>
              <FormControl>
                <Input placeholder="e.g., BBCA, BTC, SCHD" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Bank Central Asia, Bitcoin, Schwab US Dividend" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assetClass"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Class</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset class" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="equity">Equity (Stocks)</SelectItem>
                  <SelectItem value="fixed_income">Fixed Income (Bonds, Reksa Dana)</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="commodity">Commodity (Gold, Silver)</SelectItem>
                  <SelectItem value="cash">Cash & Equivalents</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
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
          name="avgBuyPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Average Buy Price (Optional)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" min="0" placeholder="Leave empty to auto-calculate from transactions" {...field} />
              </FormControl>
              <FormDescription>Used for cost basis calculation. Can be auto-calculated from transactions.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="IDR">IDR (Indonesian Rupiah)</SelectItem>
                  <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  <SelectItem value="SGD">SGD (Singapore Dollar)</SelectItem>
                </SelectContent>
              </Select>
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
            {initialData ? 'Update' : 'Create'} Holding
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}