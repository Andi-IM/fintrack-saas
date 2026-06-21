'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { insertCashFlow, updateCashFlow } from "@/features/cash-flow/actions/cash_flow"
import { useRouter } from 'next/navigation'
import { Tables } from '@/lib/database.types'
import { Loader2, Plus, Minus, Receipt, Link as LinkIcon } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { StatementItemSelect } from '@/components/receipts/StatementItemSelect'
import { ReceiptSelect } from '@/components/receipts/ReceiptSelect'

const cashFlowFormSchema = z.object({
  date: z.string().min(1, 'Tanggal & Waktu diperlukan'),
  income: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().nonnegative('Nominal harus 0 atau lebih besar').optional()
  ),
  expense: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().nonnegative('Nominal harus 0 atau lebih besar').optional()
  ),
  main_category: z.string().min(1, 'Kategori Besar diperlukan'),
  sub_category: z.string().optional(),
  description: z.string().optional(),
  payment_method: z.string().optional(),
  receipt_id: z.string().uuid().nullable().optional(),
  source_item_id: z.string().uuid().nullable().optional(),
})

type CashFlowFormValues = z.infer<typeof cashFlowFormSchema>

export function CashFlowForm({ 
  initialData, 
}: { 
  initialData?: Tables<'cash_flow'> | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof cashFlowFormSchema>>({
    resolver: zodResolver(cashFlowFormSchema as any),
    defaultValues: {
      date: (() => {
        const now = new Date()
        const offset = now.getTimezoneOffset()
        const localNow = new Date(now.getTime() - offset * 60 * 1000)
        return localNow.toISOString().slice(0, 16)
      })(),
      income: undefined as any,
      expense: undefined as any,
      main_category: 'Kebutuhan (Needs)',
      sub_category: '',
      description: '',
      payment_method: 'Tunai',
      receipt_id: null,
      source_item_id: null,
    },
  })

  useEffect(() => {
    if (initialData) {
      reset({
        date: initialData.date ? initialData.date.slice(0, 16) : new Date().toISOString().slice(0, 16),
        income: initialData.income ? Number(initialData.income) : undefined,
        expense: initialData.expense ? Number(initialData.expense) : undefined,
        main_category: initialData.main_category,
        sub_category: initialData.sub_category || '',
        description: initialData.description || '',
        payment_method: initialData.payment_method || 'Tunai',
        receipt_id: initialData.receipt_id,
        source_item_id: initialData.source_item_id,
      })
    }
  }, [initialData, reset])

  const onSubmit = async (data: CashFlowFormValues) => {
    setLoading(true)
    setServerError(null)
    try {
      const payload = {
        date: new Date(data.date).toISOString(),
        income: data.income || 0,
        expense: data.expense || 0,
        main_category: data.main_category,
        sub_category: data.sub_category || '',
        description: data.description || '',
        payment_method: data.payment_method || 'Tunai',
        receipt_id: data.receipt_id || null,
        source_item_id: data.source_item_id || null,
      }

      if (initialData) {
        const result = await updateCashFlow(initialData.id, payload)
        if (!result.success) {
          setServerError(result.error)
          return
        }
      } else {
        const result = await insertCashFlow(payload)
        if (!result.success) {
          setServerError(result.error)
          return
        }
      }

      router.refresh()
      router.push('/')
    } catch (err) {
      console.error(err)
      setServerError('Terjadi kesalahan yang tidak terduga.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl bg-white flex-1 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-lg font-bold text-slate-800">
          {initialData ? 'Edit Arus Kas' : 'Entri Arus Kas Manual'}
        </CardTitle>
        <CardDescription>
          Masukkan detail arus kas masuk dan keluar secara manual.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
          {serverError && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700 font-semibold"
            >
              {serverError}
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal & Waktu</Label>
              <Input 
                id="date"
                type="datetime-local" 
                {...register('date')}
                className="h-11 rounded-lg border-slate-200 font-mono"
                aria-invalid={!!errors.date}
                aria-describedby={errors.date ? 'date-error' : undefined}
              />
              {errors.date && <p id="date-error" className="text-xs text-rose-500 font-semibold" role="alert">{errors.date.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="main_category" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori Besar</Label>
                <select 
                  id="main_category"
                  {...register('main_category')}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  aria-invalid={!!errors.main_category}
                  aria-describedby={errors.main_category ? 'main_category-error' : undefined}
                >
                  <option value="Kebutuhan (Needs)">Kebutuhan (Needs)</option>
                  <option value="Keinginan (Wants)">Keinginan (Wants)</option>
                  <option value="Tabungan & Investasi">Tabungan & Investasi</option>
                  <option value="Pendapatan (Income)">Pendapatan (Income)</option>
                  <option value="Transfer/Lainnya">Transfer / Lainnya</option>
                </select>
                {errors.main_category && <p id="main_category-error" className="text-xs text-rose-500 font-semibold" role="alert">{errors.main_category.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub_category" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sub Kategori</Label>
                <Input 
                  id="sub_category"
                  type="text" 
                  {...register('sub_category')}
                  className="h-11 rounded-lg border-slate-200" 
                  placeholder="e.g. Makanan, Transport..." 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deskripsi / Catatan</Label>
              <Input 
                id="description"
                type="text" 
                {...register('description')}
                className="h-11 rounded-lg border-slate-200" 
                placeholder="Deskripsi detail transaksi..." 
              />
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-2">
                <Label htmlFor="income" className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <Plus className="w-3 h-3" aria-hidden="true" /> Arus Masuk (Income)
                </Label>
                <Input 
                  id="income"
                  type="number" 
                  {...register('income')}
                  className="h-11 rounded-lg border-emerald-200 font-mono focus-visible:ring-emerald-500" 
                  placeholder="0"
                  aria-invalid={!!errors.income}
                  aria-describedby={errors.income ? 'income-error' : undefined}
                />
                {errors.income && <p id="income-error" className="text-[11px] text-rose-500 font-semibold" role="alert">{errors.income.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense" className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                  <Minus className="w-3 h-3" aria-hidden="true" /> Arus Keluar (Expense)
                </Label>
                <Input 
                  id="expense"
                  type="number" 
                  {...register('expense')}
                  className="h-11 rounded-lg border-rose-200 font-mono focus-visible:ring-rose-500" 
                  placeholder="0"
                  aria-invalid={!!errors.expense}
                  aria-describedby={errors.expense ? 'expense-error' : undefined}
                />
                {errors.expense && <p id="expense-error" className="text-[11px] text-rose-500 font-semibold" role="alert">{errors.expense.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metode Pembayaran / Sumber Dana</Label>
              <select 
                id="payment_method"
                {...register('payment_method')}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              >
                <option value="Tunai">Tunai</option>
                <option value="Bank JAGO">Bank JAGO</option>
                <option value="Bank BSI">Bank BSI</option>
                <option value="Bank BNI">Bank BNI</option>
                <option value="SeaBank">SeaBank</option>
                <option value="Gopay">Gopay</option>
                <option value="Ovo">Ovo</option>
                <option value="Lainnya">Lainnya</option>
              </select>
              {errors.payment_method && <p className="text-xs text-rose-500 font-semibold">{errors.payment_method.message}</p>}
            </div>

            {/* Relasi dengan dokumen pendukung */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dokumen Pendukung (Opsional)</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    Kaitkan dengan Resit
                  </Label>
                  <Controller
                    name="receipt_id"
                    control={control}
                    render={({ field }) => (
                      <ReceiptSelect 
                        value={field.value} 
                        onChange={field.onChange}
                        onSelect={(item) => {
                          if (item.date) {
                            try {
                              const d = new Date(item.date)
                              if (!isNaN(d.getTime())) {
                                const offset = d.getTimezoneOffset()
                                const localDate = new Date(d.getTime() - offset * 60 * 1000)
                                setValue('date', localDate.toISOString().slice(0, 16))
                              }
                            } catch (e) {
                              console.error('Invalid date format', e)
                            }
                          }
                          if (!watch('description')) setValue('description', item.store_name)
                          if (!watch('expense') && !watch('income')) setValue('expense', item.total_price)
                        }}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    Kaitkan dengan Mutasi Bank
                  </Label>
                  <Controller
                    name="source_item_id"
                    control={control}
                    render={({ field }) => (
                      <StatementItemSelect 
                        value={field.value} 
                        onChange={field.onChange}
                        onSelect={(item) => {
                          if (item.date) {
                            try {
                              const d = new Date(item.date)
                              if (!isNaN(d.getTime())) {
                                const offset = d.getTimezoneOffset()
                                const localDate = new Date(d.getTime() - offset * 60 * 1000)
                                setValue('date', localDate.toISOString().slice(0, 16))
                              }
                            } catch (e) {
                              console.error('Invalid date format', e)
                            }
                          }
                          if (!watch('description')) setValue('description', item.description)
                          if (!watch('expense') && !watch('income')) {
                            if (item.type === 'income') setValue('income', item.amount)
                            else setValue('expense', item.amount)
                          }
                        }}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.push('/')} className="flex-1 h-11 rounded-lg font-bold" aria-label="Batal dan kembali ke dashboard">
              Batal
            </Button>
            <Button type="submit" data-testid="submit-cashflow-btn" disabled={loading} className="flex-1 h-11 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Simpan Perubahan' : 'Simpan Arus Kas'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
