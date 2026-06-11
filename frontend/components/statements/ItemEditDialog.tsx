'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { formatISO8601Date } from '@/lib/ocr/utils'

export interface ItemFormData {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  balance?: number
}

interface ItemEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: ItemFormData) => Promise<void>
  title: string
  initialData?: Partial<ItemFormData>
}

export default function ItemEditDialog({
  open, onOpenChange, onSave, title, initialData,
}: ItemEditDialogProps) {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')

  const wallClockParts = (iso: string): [string, string] => {
    const parts = iso.split('T')
    const datePart = parts[0] ?? ''
    const timePart = parts[1]?.replace(/[Z+\-].*$/, '').slice(0, 5) ?? '00:00'
    return [datePart, timePart]
  }

  const initIso = initialData?.date ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  const [datePart, setDatePart] = useState(wallClockParts(initIso)[0])
  const [timePart, setTimePart] = useState(wallClockParts(initIso)[1])
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [amount, setAmount] = useState(initialData?.amount ?? 0)
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type ?? 'expense')
  const [category, setCategory] = useState(initialData?.category ?? '')
  const [balance, setBalance] = useState<number | undefined>(initialData?.balance)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!datePart) e.date = 'Date is required'
    if (!description.trim()) e.description = 'Description is required'
    if (!amount || amount <= 0) e.amount = 'Amount must be greater than 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const [y, m, d] = datePart.split('-')
      const MONTH_ABBRS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
      const monthStr = MONTH_ABBRS[parseInt(m!, 10) - 1] || 'jan'
      const date = formatISO8601Date(d!, monthStr, y!, timePart || '00:00', '+07:00')
      await onSave({ date, description, amount, type, category, balance })
      onOpenChange(false)
    } catch {
      // error handled by parent
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Make changes to the transaction item below.
          </DialogDescription>
        </DialogHeader>
 
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="item-date">Tanggal</Label>
              <Input
                id="item-date"
                type="date"
                value={datePart}
                onChange={e => setDatePart(e.target.value)}
              />
              {errors.date && <p className="text-xs text-rose-500">{errors.date}</p>}
            </div>
            <div className="w-[140px] space-y-1.5">
              <Label htmlFor="item-time">Waktu</Label>
              <Input
                id="item-time"
                type="time"
                value={timePart}
                onChange={e => setTimePart(e.target.value)}
              />
            </div>
          </div>
 
          <div className="space-y-1.5">
            <Label htmlFor="item-desc">Description</Label>
            <Input
              id="item-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Transaction description"
            />
            {errors.description && <p className="text-xs text-rose-500">{errors.description}</p>}
          </div>
 
          <div className="space-y-1.5">
            <Label htmlFor="item-amount">Amount (IDR)</Label>
            <Input
              id="item-amount"
              type="number"
              min={0}
              value={amount}
              onChange={e => setAmount(e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder="0"
            />
            {errors.amount && <p className="text-xs text-rose-500">{errors.amount}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-balance">Balance (IDR)</Label>
            <Input
              id="item-balance"
              type="number"
              value={balance === undefined ? '' : balance}
              onChange={e => setBalance(e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="Running balance after this transaction"
            />
          </div>
 
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'expense' ? 'default' : 'outline'}
                size="sm"
                className={type === 'expense' ? 'bg-rose-600 hover:bg-rose-700' : ''}
                onClick={() => setType('expense')}
              >
                Expense
              </Button>
              <Button
                type="button"
                variant={type === 'income' ? 'default' : 'outline'}
                size="sm"
                className={type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => setType('income')}
              >
                Income
              </Button>
            </div>
          </div>
 
          <div className="space-y-1.5">
            <Label htmlFor="item-category">Category</Label>
            <Input
              id="item-category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Food, Transfer, Salary"
            />
          </div>
        </div>
 
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
