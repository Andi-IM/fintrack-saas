'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['stock', 'mutual_fund', 'crypto', 'gold', 'other']),
  broker: z.string().max(100).optional(),
  currency: z.string().length(3).default('IDR'),
})

type AccountFormData = z.infer<typeof accountSchema>

export default function NewAccountPage() {
  const router = useRouter()

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: {
      name: '',
      type: 'stock' as const,
      broker: '',
      currency: 'IDR' as const,
    },
  })

  const onSubmit = async (data: AccountFormData) => {
    try {
      const response = await fetch('/api/investments/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      toast.success('Account created')
      router.push('/investments/accounts')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/investments/accounts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Accounts
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create Investment Account</CardTitle>
          <CardDescription>Add a new brokerage account, wallet, or platform to track</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Bibit, Stockbit, Binance, Tokocrypto" {...field} />
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
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Link href="/investments/accounts">
                  <Button type="button" variant="secondary">Cancel</Button>
                </Link>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Account
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}