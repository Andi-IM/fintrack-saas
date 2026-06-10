'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"
import { insertTransaction, updateTransaction } from "@/lib/actions/transactions"
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function TransactionForm({ initialData }: { initialData?: any }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: 'Food',
    type: 'expense',
    note: '',
    paymentMethod: 'Cash',
    change: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date,
        amount: initialData.amount.toString(),
        category: initialData.category,
        type: initialData.type,
        note: initialData.note,
        paymentMethod: initialData.paymentMethod || 'Cash',
        change: initialData.change ? initialData.change.toString() : ''
      })
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = {
      ...formData,
      amount: Number(formData.amount),
      change: formData.change ? Number(formData.change) : 0
    }

    if (initialData) {
      await updateTransaction(initialData.id, payload)
    } else {
      await insertTransaction(payload)
    }

    setLoading(false)
    router.push('/')
  }

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl bg-white flex-1">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-lg font-bold text-slate-800">{initialData ? 'Edit Transaction' : 'Manual Entry'}</CardTitle>
        <CardDescription>Enter details of your transaction</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required className="h-11 rounded-lg border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (Rp)</Label>
              <Input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required className="h-11 rounded-lg border-slate-200" placeholder="e.g. 50000" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</Label>
              <select 
                value={formData.type} 
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</Label>
              <select 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})}
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
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Note (Optional)</Label>
            <Input type="text" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} className="h-11 rounded-lg border-slate-200" placeholder="What was this for?" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Method</Label>
              <select 
                value={formData.paymentMethod} 
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              >
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="E-Wallet">E-Wallet</option>
                <option value="Transfer">Bank Transfer</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Change (Kembalian)</span>
                <span className="text-slate-400 font-normal">Optional</span>
              </Label>
              <Input type="number" value={formData.change} onChange={(e) => setFormData({...formData, change: e.target.value})} className="h-11 rounded-lg border-slate-200 bg-slate-50" placeholder="e.g. 5000" />
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
