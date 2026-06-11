'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { insertTransaction, updateTransaction } from "@/lib/actions/transactions"
import { useRouter } from 'next/navigation'
import { Tables } from '@/lib/database.types'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const transactionFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().positive('Amount must be greater than 0')
  ),
  type: z.enum(['expense', 'income']),
  category: z.string().min(1, 'Category is required'),
  note: z.string().optional(),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  change: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().nonnegative('Change must be 0 or greater').optional()
  ),
})

type TransactionFormValues = z.infer<typeof transactionFormSchema>

export function TransactionForm({ initialData }: { initialData?: Tables<'transactions'> | null }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema as any),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: undefined as any,
      type: 'expense',
      category: 'Food',
      note: '',
      paymentMethod: 'Cash',
      change: undefined as any,
    },
  })

  useEffect(() => {
    if (initialData) {
      reset({
        date: initialData.date,
        amount: initialData.amount,
        type: initialData.type as 'expense' | 'income',
        category: initialData.category,
        note: initialData.note || '',
        paymentMethod: initialData.paymentMethod || 'Cash',
        change: initialData.change || undefined,
      })
    }
  }, [initialData, reset])

  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async (data: TransactionFormValues) => {
    setLoading(true)
    setServerError(null)
    try {
      const payload = {
        date: data.date,
        amount: data.amount,
        type: data.type,
        category: data.category,
        note: data.note || '',
        paymentMethod: data.paymentMethod,
        change: data.change || 0,
      }

      if (initialData) {
        const result = await updateTransaction(initialData.id, payload)
        if (!result.success) {
          setServerError(result.error)
          return
        }
      } else {
        const result = await insertTransaction(payload)
        if (!result.success) {
          setServerError(result.error)
          return
        }
      }

      router.push('/')
    } catch (err) {
      console.error(err)
      setServerError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl bg-white flex-1">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-lg font-bold text-slate-800">{initialData ? 'Edit Transaction' : 'Manual Entry'}</CardTitle>
        <CardDescription>Enter details of your transaction</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
          {serverError && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700 font-semibold">
              {serverError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</Label>
              <Input 
                type="date" 
                {...register('date')}
                className="h-11 rounded-lg border-slate-200" 
              />
              {errors.date && <p className="text-xs text-rose-500 font-semibold">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (Rp)</Label>
              <Input 
                type="number" 
                {...register('amount')}
                className="h-11 rounded-lg border-slate-200" 
                placeholder="e.g. 50000" 
              />
              {errors.amount && <p className="text-xs text-rose-500 font-semibold">{errors.amount.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</Label>
              <select 
                {...register('type')}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              {errors.type && <p className="text-xs text-rose-500 font-semibold">{errors.type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</Label>
              <select 
                {...register('category')}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              >
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Utilities">Utilities</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Shopping">Shopping</option>
                <option value="Salary">Salary</option>
                <option value="Other">Other</option>
              </select>
              {errors.category && <p className="text-xs text-rose-500 font-semibold">{errors.category.message}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Note (Optional)</Label>
            <Input 
              type="text" 
              {...register('note')}
              className="h-11 rounded-lg border-slate-200" 
              placeholder="What was this for?" 
            />
            {errors.note && <p className="text-xs text-rose-500 font-semibold">{errors.note.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Method</Label>
              <select 
                {...register('paymentMethod')}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              >
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="E-Wallet">E-Wallet</option>
                <option value="Transfer">Bank Transfer</option>
              </select>
              {errors.paymentMethod && <p className="text-xs text-rose-500 font-semibold">{errors.paymentMethod.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Change (Kembalian)</span>
                <span className="text-slate-400 font-normal">Optional</span>
              </Label>
              <Input 
                type="number" 
                {...register('change')}
                className="h-11 rounded-lg border-slate-200 bg-slate-50" 
                placeholder="e.g. 5000" 
              />
              {errors.change && <p className="text-xs text-rose-500 font-semibold">{errors.change.message}</p>}
            </div>
          </div>
          
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.push('/')} className="flex-1 h-11 rounded-lg font-bold">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 h-11 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Update Transaction' : 'Save Transaction'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
