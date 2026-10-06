'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/transaction'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Loader2, Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import { CashWalletWithBalance } from '@/lib/repositories/types'
import {
  insertCashWallet,
  updateCashWallet,
  deleteCashWallet,
} from '@/features/cash-wallets/actions/cash-wallets'

const walletSchema = z.object({
  name: z.string().min(1, 'Nama dompet diperlukan').max(100),
  opening_balance: z.coerce.number().nonnegative('Saldo awal tidak boleh negatif'),
})

type WalletFormData = z.infer<typeof walletSchema>

export function CashWalletList({ wallets }: { wallets: CashWalletWithBalance[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<CashWalletWithBalance | null>(null)

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0)

  const handleDelete = (wallet: CashWalletWithBalance) => {
    if (!confirm(`Hapus dompet "${wallet.name}"? Transaksi arus kas tidak akan terhapus.`)) return
    startTransition(async () => {
      const result = await deleteCashWallet(wallet.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Dompet dihapus')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">Dompet Tunai</h1>
          <p className="text-muted-foreground">Catat dan pantau uang tunai (cash) Anda</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Dompet
        </Button>
      </div>

      <Card className="bg-indigo-700 text-white border-transparent rounded-xl">
        <CardContent className="py-6">
          <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Total Saldo Tunai</p>
          <p className="text-3xl font-bold tracking-tight mt-1">{formatCurrency(totalBalance)}</p>
        </CardContent>
      </Card>

      {wallets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Belum ada dompet tunai</h3>
            <p className="text-muted-foreground mb-4">Buat dompet untuk mulai melacak uang tunai Anda</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Dompet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onEdit={() => setEditingWallet(wallet)}
              onDelete={() => handleDelete(wallet)}
              isDeleting={isPending}
            />
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Dompet Tunai</DialogTitle>
          </DialogHeader>
          <WalletForm
            onDone={() => {
              setIsCreateOpen(false)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>

      {editingWallet && (
        <Dialog open={!!editingWallet} onOpenChange={(open) => !open && setEditingWallet(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Dompet Tunai</DialogTitle>
            </DialogHeader>
            <WalletForm
              initialData={editingWallet}
              onDone={() => {
                setEditingWallet(null)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function WalletCard({
  wallet,
  onEdit,
  onDelete,
  isDeleting,
}: {
  wallet: CashWalletWithBalance
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-base font-medium">{wallet.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7" aria-label={`Edit ${wallet.name}`}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              disabled={isDeleting}
              className="h-7 w-7 text-destructive hover:text-destructive"
              aria-label={`Hapus ${wallet.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="text-2xl font-bold tabular-nums">{formatCurrency(wallet.balance)}</div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Saldo awal: {formatCurrency(Number(wallet.opening_balance))}</span>
        </div>
        <div className="flex items-center justify-between text-xs pt-2 border-t">
          <span className="flex items-center gap-1 text-emerald-600">
            <TrendingUp className="w-3 h-3" /> {formatCurrency(wallet.income)}
          </span>
          <span className="flex items-center gap-1 text-rose-600">
            <TrendingDown className="w-3 h-3" /> {formatCurrency(wallet.expense)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function WalletForm({
  initialData,
  onDone,
}: {
  initialData?: CashWalletWithBalance
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WalletFormData>({
    resolver: zodResolver(walletSchema) as any,
    defaultValues: {
      name: initialData?.name ?? '',
      opening_balance: initialData ? Number(initialData.opening_balance) : 0,
    },
  })

  const onSubmit = (data: WalletFormData) => {
    setServerError(null)
    startTransition(async () => {
      const result = initialData
        ? await updateCashWallet(initialData.id, data)
        : await insertCashWallet(data)

      if (!result.success) {
        setServerError(result.error)
        return
      }
      toast.success(initialData ? 'Dompet diperbarui' : 'Dompet dibuat')
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div role="alert" className="bg-rose-50 border-rose-200 rounded-lg p-3 text-sm text-rose-700 font-semibold">
          {serverError}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Dompet</Label>
        <Input id="name" placeholder="e.g. Dompet Utama, Uang Saku" {...register('name')} className="h-11 rounded-lg" />
        {errors.name && <p className="text-xs text-rose-500 font-semibold">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="opening_balance" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Awal</Label>
        <Input
          id="opening_balance"
          type="number"
          min={0}
          step="any"
          {...register('opening_balance')}
          className="h-11 rounded-lg font-mono"
        />
        <p className="text-[11px] text-muted-foreground">Jumlah uang tunai yang Anda pegang saat dompet dibuat.</p>
        {errors.opening_balance && <p className="text-xs text-rose-500 font-semibold">{errors.opening_balance.message}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Simpan' : 'Buat Dompet'}
        </Button>
      </DialogFooter>
    </form>
  )
}
