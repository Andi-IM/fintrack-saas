'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/utils/transaction'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Plus, Edit, Trash2, Loader2, Wallet, Building2, Coins, Gem, Banknote, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface InvestmentAccount {
  id: string
  user_id: string
  name: string
  type: 'stock' | 'mutual_fund' | 'crypto' | 'gold' | 'other'
  broker: string | null
  currency: string
  created_at: string
  updated_at: string
}

interface AccountWithStats extends InvestmentAccount {
  totalValue: number
  totalCost: number
  gainLoss: number
  gainLossPct: number
  holdingsCount: number
}

const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['stock', 'mutual_fund', 'crypto', 'gold', 'other']),
  broker: z.string().max(100).optional(),
  currency: z.string().length(3).default('IDR'),
})

type AccountFormData = z.infer<typeof accountSchema>

const TYPE_ICONS = {
  stock: Building2,
  mutual_fund: Coins,
  crypto: Gem,
  gold: Banknote,
  other: Wallet,
}

async function fetchAccounts(): Promise<AccountWithStats[]> {
  const response = await fetch('/api/investments/accounts')
  if (!response.ok) throw new Error('Failed to fetch accounts')
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function createAccount(data: AccountFormData): Promise<AccountWithStats> {
  const response = await fetch('/api/investments/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function updateAccount(id: string, data: Partial<AccountFormData>): Promise<void> {
  const response = await fetch(`/api/investments/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
}

async function deleteAccount(id: string): Promise<void> {
  const response = await fetch(`/api/investments/accounts/${id}`, {
    method: 'DELETE',
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
}

export default function InvestmentsAccountsPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountWithStats | null>(null)

  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['investment-accounts'],
    queryFn: fetchAccounts,
  })

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['investment-overview'] })
      toast.success('Account created')
      setIsCreateOpen(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AccountFormData> }) => updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['investment-overview'] })
      toast.success('Account updated')
      setEditingAccount(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['investment-overview'] })
      toast.success('Account deleted')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleCreateSubmit = async (data: AccountFormData): Promise<void> => {
    createMutation.mutate(data)
  }

  const handleUpdateSubmit = async (data: Partial<AccountFormData>): Promise<void> => {
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this account? This will also delete all holdings and transactions.')) {
      deleteMutation.mutate(id)
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investment Accounts</h1>
          <p className="text-muted-foreground">Manage your brokerage accounts and wallets</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Investment Account</DialogTitle>
            </DialogHeader>
            <AccountForm onSubmit={handleCreateSubmit} isLoading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="py-4 text-center text-destructive">
            Failed to load accounts: {error.message}
          </CardContent>
        </Card>
      ) : accounts?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No investment accounts yet</h3>
            <p className="text-muted-foreground mb-4">Create your first account to start tracking investments</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {accounts!.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={() => setEditingAccount(account)}
              onDelete={() => handleDelete(account.id)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {editingAccount && (
        <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
            </DialogHeader>
            <AccountForm
              initialData={editingAccount}
              onSubmit={handleUpdateSubmit}
              isLoading={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function AccountCard({
  account,
  onEdit,
  onDelete,
  isDeleting,
}: {
  account: AccountWithStats
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const isPositive = account.gainLoss >= 0
  const TypeIcon = TYPE_ICONS[account.type] || Wallet

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle className="text-base font-medium">{account.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} disabled={isDeleting} className="h-7 w-7 text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tabular-nums">
            {formatCurrency(account.totalValue)}
          </span>
          <Badge variant={isPositive ? 'default' : 'destructive'} className="gap-1">
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {isPositive ? '+' : ''}{account.gainLossPct.toFixed(2)}%
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Cost: {formatCurrency(account.totalCost)}</span>
          <span>{account.holdingsCount} holdings</span>
        </div>
        <div className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isPositive ? '+' : ''}{formatCurrency(account.gainLoss)}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1">
            <TypeIcon className="w-3 h-3" />
            {account.type.replace('_', ' ')}
          </span>
          {account.broker && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {account.broker}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AccountForm({
  initialData,
  onSubmit,
  isLoading,
}: {
  initialData?: AccountWithStats
  onSubmit: (data: AccountFormData) => Promise<void>
  isLoading: boolean
}) {
  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: initialData
      ? {
          name: initialData.name,
          type: initialData.type,
          broker: initialData.broker ?? '',
          currency: initialData.currency,
        }
      : {
          name: '',
          type: 'stock' as const,
          broker: '',
          currency: 'IDR' as const,
        },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Bibit, Stockbit, Binance" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="stock">Stock Brokerage</SelectItem>
                  <SelectItem value="mutual_fund">Mutual Fund Platform</SelectItem>
                  <SelectItem value="crypto">Crypto Exchange</SelectItem>
                  <SelectItem value="gold">Gold/Commodity</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="broker"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Broker/Platform (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Bibit, Bareksa, Binance, Tokocrypto" {...field} />
              </FormControl>
              <FormDescription>Name of the broker or platform</FormDescription>
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
            {initialData ? 'Update' : 'Create'} Account
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}