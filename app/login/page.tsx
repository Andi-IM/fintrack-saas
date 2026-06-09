import { login } from '@/lib/actions/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LockIcon } from 'lucide-react'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const { message } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-indigo-600 rounded-xl">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mb-2">
            <LockIcon className="w-8 h-8 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Private Vault</CardTitle>
          <CardDescription className="text-base text-slate-500">Secure financial gateway.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-600 font-semibold">Email Address</Label>
              <Input 
                id="email" 
                name="email"
                type="email" 
                autoFocus
                placeholder="name@example.com" 
                className="h-12 border-slate-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600"
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Send Magic Link</Button>
            
            {message && (
              <div className="p-4 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium border border-indigo-200 text-center">
                {message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
