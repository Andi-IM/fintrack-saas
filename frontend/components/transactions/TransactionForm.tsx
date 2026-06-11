'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { insertTransaction, updateTransaction } from "@/lib/actions/transactions"
import { saveReceipt } from "@/lib/actions/receipts"
import { useRouter } from 'next/navigation'
import { Tables } from '@/lib/database.types'
import { Loader2, UploadCloud, Sparkles, AlertCircle, Trash2, Plus, CheckCircle2, Camera, X, FileText } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDropzone } from 'react-dropzone'
import { scanDocumentWithAI } from '@/lib/actions/ocr'
import { compressImageIfNeeded } from '@/lib/ocr/compress-image'

const transactionFormSchema = z.object({
  // Manual transaction fields
  date: z.string().min(1, 'Date/Time is required'),
  amount: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().positive('Amount must be greater than 0')
  ),
  type: z.enum(['expense', 'income']).optional().default('expense'),
  category: z.string().min(1, 'Category is required'),
  note: z.string().optional(),
  paymentMethod: z.string().optional(),
  change: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().nonnegative().optional()
  ),

  // Scanned Receipt fields
  isReceipt: z.boolean().optional().default(false),
  receiptType: z.enum(['shopping', 'atm']).optional().default('shopping'),
  merchant: z.string().optional(),
  storeAddress: z.string().optional().nullable(),
  amountPaid: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().nonnegative().optional()
  ),
  atmId: z.string().optional().nullable(),
  transactionType: z.enum(['withdrawal', 'deposit', 'transfer']).optional().nullable(),
  fee: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().nonnegative().optional()
  ),
  
  items: z.array(z.object({
    name: z.string().min(1, 'Item name is required'),
    price: z.coerce.number().nonnegative('Price must be 0 or greater'),
    quantity: z.coerce.number().positive('Quantity must be greater than 0'),
    amount: z.coerce.number().nonnegative().optional(),
  })).optional().default([]),
})

type TransactionFormValues = z.infer<typeof transactionFormSchema>

export function TransactionForm({ 
  initialData, 
  scanMode = false 
}: { 
  initialData?: Tables<'transactions'> | null
  scanMode?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Scanner States
  const [showScanner, setShowScanner] = useState(scanMode)
  const [fileToScan, setFileToScan] = useState<File | null>(null)
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [scanProgress, setScanProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<z.input<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema as any),
    defaultValues: {
      date: scanMode 
        ? (() => {
            const now = new Date()
            const offset = now.getTimezoneOffset()
            const localNow = new Date(now.getTime() - offset * 60 * 1000)
            return localNow.toISOString().slice(0, 16)
          })()
        : new Date().toISOString().split('T')[0],
      amount: undefined as any,
      type: 'expense',
      category: 'Food',
      note: '',
      paymentMethod: 'Cash',
      change: undefined as any,
      items: [],
      isReceipt: scanMode,
      receiptType: 'shopping',
      merchant: '',
      storeAddress: '',
      amountPaid: undefined as any,
      atmId: '',
      transactionType: 'withdrawal',
      fee: 0
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  })

  const transactionType = watch('type')
  const isReceipt = watch('isReceipt')
  const watchedReceiptType = watch('receiptType')
  const watchedItems = watch('items')

  // Auto-calculate total amount based on items (for Shopping Receipt or manual Expense with items)
  useEffect(() => {
    const shouldCalculate = watchedItems && watchedItems.length > 0 && (
      (isReceipt && watchedReceiptType === 'shopping') ||
      (!isReceipt && transactionType === 'expense')
    )
    if (shouldCalculate) {
      const total = watchedItems.reduce((sum, item) => {
        const itemAmount = (Number(item.price) || 0) * (Number(item.quantity) || 1)
        return sum + itemAmount
      }, 0)
      setValue('amount', total)
    }
  }, [watchedItems, isReceipt, watchedReceiptType, transactionType, setValue])

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
        items: Array.isArray(initialData.items) ? (initialData.items as any[]).map(item => ({
          name: item.productName || item.name || '',
          price: item.price || 0,
          quantity: item.quantity || 1,
          amount: item.amount || (item.price || 0) * (item.quantity || 1)
        })) : [],
        isReceipt: false
      })
    }
  }, [initialData, reset])

  const [serverError, setServerError] = useState<string | null>(null)

  // OCR Dropzone handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      let file = acceptedFiles[0]
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      
      if (isPdf && file.size > 1024 * 1024) {
        setErrorMessage('File size exceeds the 1MB limit for PDFs.')
        setScanStatus('error')
        setFileToScan(null)
        return
      }

      if (!isPdf && file.size > 1024 * 1024) {
        file = await compressImageIfNeeded(file)
      }

      setFileToScan(file)
      setScanStatus('idle')
      setErrorMessage(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  })

  const handleProcessScan = async () => {
    if (!fileToScan) return
    setScanStatus('scanning')
    setScanProgress(0)
    setErrorMessage(null)
    
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 5
      })
    }, 150)
    
    const formData = new FormData()
    formData.append('file', fileToScan)
    formData.append('context', 'Receipt')
    
    const offsetMinutes = new Date().getTimezoneOffset()
    const absOffset = Math.abs(offsetMinutes)
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0')
    const mins = String(absOffset % 60).padStart(2, '0')
    const offsetStr = `${offsetMinutes <= 0 ? '+' : '-'}${hours}:${mins}`
    formData.append('timezoneOffset', offsetStr)
    
    try {
      const result = await scanDocumentWithAI(formData)
      clearInterval(progressInterval)
      setScanProgress(100)
      
      if (result.success) {
        if (result.data) {
          const scanResult = result.data
          setScanStatus('success')
          setValue('isReceipt', true)
          setValue('receiptType', scanResult.type || 'shopping')
          setValue('merchant', scanResult.merchant || '')
          setValue('amount', scanResult.total || 0)
          
          if (scanResult.date) {
            // Convert to local datetime-local format (YYYY-MM-DDTHH:MM)
            const dateObj = new Date(scanResult.date)
            const offset = dateObj.getTimezoneOffset()
            const localDate = new Date(dateObj.getTime() - offset * 60 * 1000)
            setValue('date', localDate.toISOString().slice(0, 16))
          } else {
            // Set current time in datetime-local format
            const now = new Date()
            const offset = now.getTimezoneOffset()
            const localNow = new Date(now.getTime() - offset * 60 * 1000)
            setValue('date', localNow.toISOString().slice(0, 16))
          }
          
          setValue('storeAddress', scanResult.address || '')
          setValue('paymentMethod', scanResult.paymentMethod || 'Cash')
          setValue('amountPaid', scanResult.amountPaid || scanResult.total || 0)
          setValue('change', scanResult.change || 0)
          setValue('atmId', scanResult.atmId || '')
          setValue('transactionType', scanResult.transactionType || 'withdrawal')
          setValue('fee', scanResult.fee || 0)
          
          // Populating items
          if (scanResult.items && scanResult.items.length > 0) {
            const formattedItems = (scanResult.items as any[]).map(item => ({
              name: item.name || '',
              price: item.price || item.amount || 0,
              quantity: item.quantity || 1,
              amount: item.amount || (item.price || 0) * (item.quantity || 1)
            }))
            setValue('items', formattedItems)
          } else {
            setValue('items', [])
          }
        } else {
          setScanStatus('error')
          setErrorMessage('No data returned from scanner')
        }
      } else {
        setScanStatus('error')
        setErrorMessage(result.error || 'Failed to scan document')
      }
    } catch (err) {
      clearInterval(progressInterval)
      setScanStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during scanning')
    }
  }

  const handleResetScan = () => {
    setFileToScan(null)
    setScanStatus('idle')
    setScanProgress(0)
    setErrorMessage(null)
    setValue('isReceipt', false)
    reset({
      date: new Date().toISOString().split('T')[0],
      amount: undefined as any,
      type: 'expense',
      category: 'Food',
      note: '',
      paymentMethod: 'Cash',
      change: undefined as any,
      items: [],
      isReceipt: false,
      receiptType: 'shopping',
      merchant: '',
      storeAddress: '',
      amountPaid: undefined as any,
      atmId: '',
      transactionType: 'withdrawal',
      fee: 0
    })
  }

  const onSubmit = async (data: TransactionFormValues) => {
    setLoading(true)
    setServerError(null)
    try {
      if (data.isReceipt) {
        // Save to receipts table
        const formattedItems = (data.items || []).map(item => ({
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
        }))

        let isoDate = new Date().toISOString()
        try {
          if (data.date) {
            isoDate = new Date(data.date).toISOString()
          }
        } catch (e) {
          console.error(e)
        }

        const result = await saveReceipt({
          type: data.receiptType || 'shopping',
          storeName: data.merchant || 'Unknown Merchant',
          storeAddress: data.storeAddress || null,
          date: isoDate,
          totalPrice: data.amount || 0,
          paymentMethod: data.paymentMethod || 'Cash',
          amountPaid: data.amountPaid || data.amount || 0,
          change: data.change || 0,
          atmId: data.atmId || null,
          transactionType: data.transactionType || null,
          fee: data.fee || 0,
          items: formattedItems,
          file: fileToScan,
        })

        if (!result.success) {
          setServerError(result.error)
          return
        }
      } else {
        // Save to transactions table
        const formattedItems = (data.items || []).map(item => ({
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          amount: item.price * item.quantity
        }))

        const payload = {
          date: data.date,
          amount: data.amount,
          type: data.type || 'expense',
          category: data.category || 'Other',
          note: data.note || '',
          paymentMethod: data.paymentMethod || 'Cash',
          change: data.change || 0,
          items: formattedItems
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
    <Card className="shadow-sm border-slate-200 rounded-xl bg-white flex-1 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
      <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-bold text-slate-800">
            {initialData ? 'Edit Transaction' : isReceipt ? 'Confirm Scanned Receipt' : 'Transaction Entry'}
          </CardTitle>
          <CardDescription>
            {isReceipt ? 'Tinjau dan edit data ekstraksi struk Anda' : 'Enter details of your transaction'}
          </CardDescription>
        </div>
        {!initialData && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowScanner(!showScanner)}
            className="text-xs font-bold gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <Camera className="w-3.5 h-3.5" />
            {showScanner ? 'Sembunyikan Scanner' : 'Pindai Resit Belanja'}
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Scanner Dropzone Section */}
        {showScanner && !initialData && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-indigo-950">Smart Receipt Scanner</span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowScanner(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {scanStatus === 'idle' && !fileToScan && (
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ease-in-out
                  ${isDragActive ? 'border-indigo-500 bg-indigo-50 shadow-inner' : 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 bg-white'}`}
              >
                <input {...getInputProps()} />
                <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-indigo-950 mb-0.5">
                  Drag & drop receipt image or PDF here
                </p>
                <p className="text-[10px] text-slate-500">Max size: 1MB. Support PDF, JPG, PNG</p>
              </div>
            )}

            {fileToScan && scanStatus === 'idle' && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate">{fileToScan.name}</p>
                  <p className="text-[10px] text-slate-500">{(fileToScan.size / 1024).toFixed(0)} KB</p>
                </div>
                <div className="flex gap-1.5">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-xs px-2 h-8 font-bold" 
                    onClick={handleResetScan}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 h-8 font-bold"
                    onClick={handleProcessScan}
                  >
                    Mulai Scan
                  </Button>
                </div>
              </div>
            )}

            {scanStatus === 'scanning' && (
              <div className="bg-white border border-indigo-100 rounded-xl p-5 text-center space-y-3 shadow-inner">
                <div className="relative w-14 h-14 mx-auto">
                  <svg className="animate-spin w-full h-full text-indigo-100" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75 text-indigo-600" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-indigo-700">{scanProgress}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Memproses Dokumen...</p>
                  <p className="text-[10px] text-slate-500">Mengekstrak data transaksi menggunakan AI</p>
                </div>
              </div>
            )}

            {scanStatus === 'error' && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center space-y-3 shadow-sm">
                <div className="bg-rose-100 w-9 h-9 rounded-full flex items-center justify-center mx-auto text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Proses Pemindaian Gagal</p>
                  <p className="text-[10px] text-rose-600 mt-1 leading-normal break-words">{errorMessage}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full font-bold text-xs h-8 border-rose-200 text-rose-700 hover:bg-rose-50" 
                  onClick={handleResetScan}
                >
                  Coba Lagi
                </Button>
              </div>
            )}

            {scanStatus === 'success' && (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-xs font-semibold text-emerald-900 leading-normal">
                    <p className="font-bold text-emerald-950 mb-0.5">Pemindaian Berhasil!</p>
                    <p className="text-[11px] text-emerald-800 font-normal">Kolom formulir di bawah ini telah diisi otomatis. Silakan tinjau sebelum menyimpan.</p>
                    <button 
                      type="button" 
                      onClick={handleResetScan} 
                      className="mt-1 text-[10px] font-bold text-emerald-700 hover:underline"
                    >
                      Reset & Hapus File Pemindaian
                    </button>
                  </div>
                </div>

                {/* Display Scanned File Preview */}
                {fileToScan && (
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-700">Berkas Dipindai: {fileToScan.name}</span>
                      <span className="text-[10px] text-slate-400">{(fileToScan.size / 1024).toFixed(0)} KB</span>
                    </div>
                    {fileToScan.type.startsWith('image/') ? (
                      <div className="relative w-full h-48 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={URL.createObjectURL(fileToScan)} 
                          alt="Pratinjau Struk" 
                          className="max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-lg flex items-center gap-2 text-xs text-indigo-700 font-semibold justify-center">
                        <FileText className="w-4 h-4" />
                        Dokumen PDF ({fileToScan.name})
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
          {serverError && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700 font-semibold">
              {serverError}
            </div>
          )}
          
          {isReceipt ? (
            /* ========================================================
               RECEIPT MODE FORM (ATM or SHOPPING layouts)
               ======================================================== */
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receipt Type</Label>
                  <select 
                    {...register('receiptType')}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 font-bold"
                  >
                    <option value="shopping">Belanja (Shopping)</option>
                    <option value="atm">ATM (Withdrawal/Deposit)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {watchedReceiptType === 'atm' ? 'Merchant / Bank' : 'Merchant / Bank'}
                  </Label>
                  <Input 
                    {...register('merchant')}
                    className="h-11 rounded-lg border-slate-200 font-bold" 
                  />
                  {errors.merchant && <p className="text-xs text-rose-500 font-semibold">{errors.merchant.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</Label>
                  <Input 
                    type="datetime-local" 
                    {...register('date')}
                    className="h-11 rounded-lg border-slate-200 font-mono font-bold" 
                  />
                  {errors.date && <p className="text-xs text-rose-500 font-semibold">{errors.date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount</Label>
                  <Input 
                    type="number" 
                    {...register('amount')}
                    className="h-11 rounded-lg border-slate-200 font-mono text-indigo-600 font-bold" 
                  />
                  {errors.amount && <p className="text-xs text-rose-500 font-semibold">{errors.amount.message}</p>}
                </div>
              </div>

              {watchedReceiptType === 'atm' ? (
                /* ========================================================
                   ATM RECEIPT FIELDS
                   ======================================================== */
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ATM ID / Terminal</Label>
                      <Input 
                        {...register('atmId')}
                        placeholder="e.g. ATM001"
                        className="h-11 rounded-lg border-slate-200 font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction Type</Label>
                      <select 
                        {...register('transactionType')}
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 font-bold"
                      >
                        <option value="withdrawal">Penarikan (Withdrawal)</option>
                        <option value="deposit">Setoran (Deposit)</option>
                        <option value="transfer">Transfer</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Fee</Label>
                      <Input 
                        type="number" 
                        {...register('fee')}
                        className="h-11 rounded-lg border-slate-200 font-mono font-bold" 
                      />
                    </div>
                    <div></div>
                  </div>
                </div>
              ) : (
                /* ========================================================
                   SHOPPING RECEIPT FIELDS
                   ======================================================== */
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Store Address</Label>
                    <Input 
                      {...register('storeAddress')}
                      placeholder="e.g. Jl. Raya Kemang No. 10"
                      className="h-11 rounded-lg border-slate-200" 
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Method</Label>
                      <Input 
                        {...register('paymentMethod')}
                        className="h-11 rounded-lg border-slate-200 font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cash Paid</Label>
                      <Input 
                        type="number" 
                        {...register('amountPaid')}
                        className="h-11 rounded-lg border-slate-200 font-mono font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Change (Kembalian)</Label>
                      <Input 
                        type="number" 
                        {...register('change')}
                        className="h-11 rounded-lg border-slate-200 font-mono font-bold" 
                      />
                    </div>
                  </div>

                  {/* Items Editor Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Identified Items ({fields.length})
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ name: '', price: 0, quantity: 1 })}
                        className="h-7 text-[11px] font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Item
                      </Button>
                    </div>

                    {fields.length > 0 ? (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {fields.map((field, i) => (
                          <div key={field.id} className="flex gap-2 items-center pb-2 border-b border-slate-200 border-dashed last:border-0 last:pb-0">
                            <Input
                              {...register(`items.${i}.name`)}
                              placeholder="Nama Barang"
                              className="h-9 text-xs flex-1 bg-white border-slate-200"
                            />
                            <Input
                              type="number"
                              {...register(`items.${i}.price`)}
                              placeholder="Harga"
                              className="h-9 text-xs w-28 bg-white border-slate-200 text-right font-mono"
                            />
                            <Input
                              type="number"
                              {...register(`items.${i}.quantity`)}
                              placeholder="Qty"
                              className="h-9 text-xs w-16 bg-white border-slate-200 text-center font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => remove(i)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                              title="Hapus barang"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic text-center py-2 bg-white rounded-lg border border-slate-100">
                        Belum ada item belanja. Klik &quot;Tambah Item&quot; atau pindai struk.
                      </p>
                    )}

                    {fields.length > 0 && (
                      <div className="text-[11px] text-right font-bold text-slate-500 pt-1.5 border-t border-slate-200">
                        Total nominal dihitung otomatis dari rincian barang (bisa diubah manual).
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================
               MANUAL ENTRY / DEFAULT MODE FORM
               ======================================================== */
            <div className="space-y-5">
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
                    className="h-11 rounded-lg border-slate-200 font-mono" 
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
                    className="h-11 rounded-lg border-slate-200" 
                    placeholder="e.g. 5000" 
                  />
                  {errors.change && <p className="text-xs text-rose-500 font-semibold">{errors.change.message}</p>}
                </div>
              </div>

              {/* Items Editor Section - Only shown for Expense type when items exist */}
              {transactionType === 'expense' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Daftar Barang Belanja ({fields.length})
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ name: '', price: 0, quantity: 1 })}
                      className="h-7 text-[11px] font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Item
                    </Button>
                  </div>

                  {fields.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {fields.map((field, i) => (
                        <div key={field.id} className="flex gap-2 items-center pb-2 border-b border-slate-200 border-dashed last:border-0 last:pb-0">
                          <Input
                            {...register(`items.${i}.name`)}
                            placeholder="Nama Barang"
                            className="h-9 text-xs flex-1 bg-white border-slate-200"
                          />
                          <Input
                            type="number"
                            {...register(`items.${i}.price`)}
                            placeholder="Harga Satuan"
                            className="h-9 text-xs w-28 bg-white border-slate-200 text-right font-mono"
                          />
                          <Input
                            type="number"
                            {...register(`items.${i}.quantity`)}
                            placeholder="Qty"
                            className="h-9 text-xs w-16 bg-white border-slate-200 text-center font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => remove(i)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus barang"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic text-center py-2 bg-white rounded-lg border border-slate-100">
                      Belum ada item belanja. Klik &quot;Tambah Item&quot; atau pindai struk.
                    </p>
                  )}

                  {fields.length > 0 && (
                    <div className="text-[11px] text-right font-bold text-slate-500 pt-1.5 border-t border-slate-200">
                      Total nominal dihitung otomatis dari rincian barang (bisa diubah manual).
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.push('/')} className="flex-1 h-11 rounded-lg font-bold">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 h-11 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Update Transaction' : isReceipt ? 'Confirm & Save' : 'Save Transaction'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
