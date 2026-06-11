'use client'

import { useEffect, useTransition } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  Calendar, 
  MapPin, 
  CreditCard,
  Hash,
  ShieldAlert
} from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateReceipt, deleteReceipt, ReceiptWithItems } from "@/lib/actions/receipts"
import { formatCurrency } from "@/lib/utils/transaction"

const receiptItemSchema = z.object({
  productName: z.string().min(1, 'Nama barang harus diisi'),
  quantity: z.preprocess(
    (val) => (val === '' ? 1 : Number(val)),
    z.number().positive('Jumlah harus lebih besar dari 0')
  ),
  price: z.preprocess(
    (val) => (val === '' ? 0 : Number(val)),
    z.number().nonnegative('Harga tidak boleh negatif')
  ),
})

const receiptEditSchema = z.object({
  type: z.enum(['shopping', 'atm']),
  storeName: z.string().min(1, 'Nama toko/bank harus diisi'),
  storeAddress: z.string().nullable().optional(),
  date: z.string().min(1, 'Tanggal & waktu harus diisi'),
  totalPrice: z.preprocess(
    (val) => (val === '' ? 0 : Number(val)),
    z.number().nonnegative('Total nominal tidak boleh negatif')
  ),
  paymentMethod: z.string().nullable().optional(),
  amountPaid: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().nonnegative('Uang dibayar tidak boleh negatif').nullable().optional()
  ),
  change: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().nonnegative('Kembalian tidak boleh negatif').nullable().optional()
  ),
  atmId: z.string().nullable().optional(),
  transactionType: z.enum(['withdrawal', 'deposit', 'transfer']).nullable().optional(),
  fee: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().nonnegative('Biaya admin tidak boleh negatif').nullable().optional()
  ),
  items: z.array(receiptItemSchema).optional().default([]),
})

type ReceiptEditFormValues = z.input<typeof receiptEditSchema>

interface ReceiptEditDialogProps {
  receipt: ReceiptWithItems
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const formatForInput = (dateStr: string) => {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    return ''
  }
}

export function ReceiptEditDialog({ receipt, open, onOpenChange, onSuccess }: ReceiptEditDialogProps) {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<ReceiptEditFormValues>({
    resolver: zodResolver(receiptEditSchema),
    defaultValues: {
      type: receipt.type as 'shopping' | 'atm',
      storeName: receipt.store_name,
      storeAddress: receipt.store_address || '',
      date: formatForInput(receipt.date),
      totalPrice: Number(receipt.total_price),
      paymentMethod: receipt.payment_method || '',
      amountPaid: receipt.amount_paid !== null ? Number(receipt.amount_paid) : null,
      change: receipt.change !== null ? Number(receipt.change) : null,
      atmId: receipt.atm_id || '',
      transactionType: (receipt.transaction_type as 'withdrawal' | 'deposit' | 'transfer') || null,
      fee: receipt.fee !== null ? Number(receipt.fee) : 0,
      items: receipt.receipts_items.map(item => ({
        productName: item.product_name,
        quantity: Number(item.quantity),
        price: Number(item.price),
      }))
    }
  })

  // Reset form values if selected receipt changes
  useEffect(() => {
    reset({
      type: receipt.type as 'shopping' | 'atm',
      storeName: receipt.store_name,
      storeAddress: receipt.store_address || '',
      date: formatForInput(receipt.date),
      totalPrice: Number(receipt.total_price),
      paymentMethod: receipt.payment_method || '',
      amountPaid: receipt.amount_paid !== null ? Number(receipt.amount_paid) : null,
      change: receipt.change !== null ? Number(receipt.change) : null,
      atmId: receipt.atm_id || '',
      transactionType: (receipt.transaction_type as 'withdrawal' | 'deposit' | 'transfer') || null,
      fee: receipt.fee !== null ? Number(receipt.fee) : 0,
      items: receipt.receipts_items.map(item => ({
        productName: item.product_name,
        quantity: Number(item.quantity),
        price: Number(item.price),
      }))
    })
  }, [receipt, reset])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  })

  const type = watch('type')
  const watchedItems = watch('items') || []

  // Auto calculate total for shopping receipt
  const calculatedTotal = watchedItems.reduce((acc, item) => {
    const qty = Number(item?.quantity) || 0
    const price = Number(item?.price) || 0
    return acc + (qty * price)
  }, 0)

  useEffect(() => {
    if (type === 'shopping') {
      setValue('totalPrice', calculatedTotal)
    }
  }, [calculatedTotal, setValue, type])

  const onSubmit = (values: ReceiptEditFormValues) => {
    const parsed = receiptEditSchema.safeParse(values)
    if (!parsed.success) {
      console.error('Validation error on submit:', parsed.error)
      return
    }

    startTransition(async () => {
      // Re-map to the shape saveReceipt expects
      const formattedInput = {
        type: parsed.data.type,
        storeName: parsed.data.storeName,
        storeAddress: parsed.data.storeAddress || null,
        date: new Date(parsed.data.date).toISOString(),
        totalPrice: parsed.data.totalPrice,
        paymentMethod: parsed.data.paymentMethod || null,
        amountPaid: parsed.data.amountPaid,
        change: parsed.data.change,
        atmId: parsed.data.atmId || null,
        transactionType: parsed.data.transactionType || null,
        fee: parsed.data.fee,
        items: parsed.data.type === 'shopping' ? parsed.data.items : [],
      }

      const res = await updateReceipt(receipt.id, formattedInput)
      if (res.success) {
        onSuccess()
      } else {
        alert(`Gagal memperbarui struk: ${res.error}`)
      }
    })
  }

  const handleDelete = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus struk ini? Semua data barang terkait juga akan dihapus.")) {
      return
    }

    startTransition(async () => {
      const res = await deleteReceipt(receipt.id)
      if (res.success) {
        onOpenChange(false)
        onSuccess()
      } else {
        alert(`Gagal menghapus struk: ${res.error}`)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md md:max-w-2xl p-0 overflow-hidden bg-slate-50 rounded-3xl border border-slate-200 shadow-2xl"
        aria-describedby={undefined}
      >
        <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 text-white p-6">
          <DialogTitle className="text-xl font-bold">Edit Data Struk</DialogTitle>
          <DialogDescription className="text-indigo-200 mt-1">
            Perbarui data hasil ekstraksi struk Anda secara manual.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Section 1: Basic Metadata */}
          <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informasi Utama</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs font-semibold text-slate-700">Tipe Struk</Label>
                <select
                  id="type"
                  {...register('type')}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="shopping">Belanja (Shopping)</option>
                  <option value="atm">Struk ATM</option>
                </select>
                {errors.type && <p className="text-[11px] text-rose-500">{errors.type.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-xs font-semibold text-slate-700">Tanggal & Waktu</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="date"
                    type="datetime-local"
                    {...register('date')}
                    className="pl-9 h-10 text-sm"
                  />
                </div>
                {errors.date && <p className="text-[11px] text-rose-500">{errors.date.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="storeName" className="text-xs font-semibold text-slate-700">
                  {type === 'atm' ? 'Nama Bank / ATM' : 'Nama Toko / Merchant'}
                </Label>
                <Input
                  id="storeName"
                  placeholder={type === 'atm' ? 'e.g., Bank Syariah Indonesia' : 'e.g., Raudhah Swalayan'}
                  {...register('storeName')}
                  className="h-10 text-sm"
                />
                {errors.storeName && <p className="text-[11px] text-rose-500">{errors.storeName.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="storeAddress" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Alamat / Lokasi
                </Label>
                <Input
                  id="storeAddress"
                  placeholder="Alamat toko atau lokasi mesin ATM..."
                  {...register('storeAddress')}
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Specific fields depending on type */}
          {type === 'shopping' ? (
            <>
              {/* Shopping Metadata */}
              <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detail Pembayaran</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      Metode Pembayaran
                    </Label>
                    <Input
                      id="paymentMethod"
                      placeholder="e.g., Tunai, Debit, Qris"
                      {...register('paymentMethod')}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amountPaid" className="text-xs font-semibold text-slate-700">Uang Dibayar</Label>
                    <Input
                      id="amountPaid"
                      type="number"
                      placeholder="0"
                      {...register('amountPaid')}
                      className="h-10 text-sm"
                    />
                    {errors.amountPaid && <p className="text-[11px] text-rose-500">{errors.amountPaid.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="change" className="text-xs font-semibold text-slate-700">Kembalian</Label>
                    <Input
                      id="change"
                      type="number"
                      placeholder="0"
                      {...register('change')}
                      className="h-10 text-sm"
                    />
                    {errors.change && <p className="text-[11px] text-rose-500">{errors.change.message}</p>}
                  </div>
                </div>
              </div>

              {/* Shopping items list */}
              <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daftar Barang Belanja</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productName: '', quantity: 1, price: 0 })}
                    className="h-8 rounded-lg text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Barang
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                    Belum ada barang. Klik tombol di atas untuk menambahkan barang belanjaan.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="flex flex-col md:flex-row gap-3 items-start md:items-end border-b border-slate-50 pb-3 md:pb-0 md:border-none">
                        <div className="w-full md:flex-1 space-y-1.5">
                          <Label className="text-[10px] text-slate-400 font-semibold md:hidden">Nama Barang</Label>
                          <Input
                            placeholder="Nama Barang"
                            {...register(`items.${idx}.productName` as const)}
                            className="h-9 text-xs"
                          />
                          {errors.items?.[idx]?.productName && (
                            <p className="text-[10px] text-rose-500 mt-0.5">{errors.items[idx]?.productName?.message}</p>
                          )}
                        </div>

                        <div className="w-full md:w-20 space-y-1.5">
                          <Label className="text-[10px] text-slate-400 font-semibold md:hidden">Jumlah</Label>
                          <Input
                            type="number"
                            placeholder="Qty"
                            {...register(`items.${idx}.quantity` as const)}
                            className="h-9 text-xs"
                          />
                          {errors.items?.[idx]?.quantity && (
                            <p className="text-[10px] text-rose-500 mt-0.5">{errors.items[idx]?.quantity?.message}</p>
                          )}
                        </div>

                        <div className="w-full md:w-32 space-y-1.5">
                          <Label className="text-[10px] text-slate-400 font-semibold md:hidden">Harga Satuan</Label>
                          <Input
                            type="number"
                            placeholder="Harga"
                            {...register(`items.${idx}.price` as const)}
                            className="h-9 text-xs"
                          />
                          {errors.items?.[idx]?.price && (
                            <p className="text-[10px] text-rose-500 mt-0.5">{errors.items[idx]?.price?.message}</p>
                          )}
                        </div>

                        <div className="w-full md:w-32 text-right hidden md:block pb-2">
                          <p className="text-[10px] text-slate-400">Subtotal</p>
                          <p className="text-xs font-semibold text-slate-800 font-mono">
                            {formatCurrency((Number(watch(`items.${idx}.quantity`)) || 0) * (Number(watch(`items.${idx}.price`)) || 0))}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(idx)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg md:mb-0.5 h-9 w-9 flex-shrink-0 align-bottom self-end md:self-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-slate-100 font-bold text-sm">
                  <span className="text-slate-600">Total Harga Terkalkulasi</span>
                  <span className="font-mono text-indigo-700">{formatCurrency(calculatedTotal)}</span>
                </div>
              </div>
            </>
          ) : (
            /* ATM Metadata */
            <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detail Transaksi ATM</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="atmId" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    ATM Terminal ID
                  </Label>
                  <Input
                    id="atmId"
                    placeholder="e.g., S1ARJAGO"
                    {...register('atmId')}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionType" className="text-xs font-semibold text-slate-700">Jenis Transaksi</Label>
                  <select
                    id="transactionType"
                    {...register('transactionType')}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Pilih Jenis Transaksi</option>
                    <option value="withdrawal">Tarik Tunai</option>
                    <option value="deposit">Setor Tunai</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalPrice" className="text-xs font-semibold text-slate-700">Nominal Transaksi</Label>
                  <Input
                    id="totalPrice"
                    type="number"
                    placeholder="0"
                    {...register('totalPrice')}
                    className="h-10 text-sm"
                  />
                  {errors.totalPrice && <p className="text-[11px] text-rose-500">{errors.totalPrice.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fee" className="text-xs font-semibold text-slate-700">Biaya Admin</Label>
                  <Input
                    id="fee"
                    type="number"
                    placeholder="0"
                    {...register('fee')}
                    className="h-10 text-sm"
                  />
                  {errors.fee && <p className="text-[11px] text-rose-500">{errors.fee.message}</p>}
                </div>
              </div>
            </div>
          )}
        </form>

        <DialogFooter className="bg-white p-4 border-t border-slate-100 gap-2 flex-row justify-between items-center">
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-xl text-xs px-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Hapus
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-xl text-xs px-4"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isPending}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 px-4"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Simpan Perubahan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
