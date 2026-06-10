import { login } from '@/lib/actions/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Github, LockIcon } from 'lucide-react'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const { message } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans relative overflow-hidden">
      {/* Background gradients for premium glassmorphic feel */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1000"></div>

      <Card className="w-full max-w-md shadow-2xl border border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-2xl relative z-10">
        <CardHeader className="space-y-2 text-center pb-8 pt-10">
          <div className="mx-auto bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mb-2 border border-slate-700 shadow-inner">
            <LockIcon className="w-7 h-7 text-indigo-400" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white font-poppins">Private Vault</CardTitle>
          <CardDescription className="text-base text-slate-400">Secure financial gateway.</CardDescription>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <form action={login} className="space-y-6">
            <Button 
              type="submit" 
              className="w-full h-12 text-sm font-bold bg-white hover:bg-slate-100 text-slate-950 rounded-xl transition-all shadow-lg shadow-white/5 flex items-center justify-center gap-3 border border-slate-200"
            >
              <Github className="w-5 h-5 text-slate-950" />
              Continue with GitHub
            </Button>
            
            {message && (
              <div className="p-4 bg-rose-950/40 text-rose-300 rounded-xl text-sm font-medium border border-rose-900/60 text-center break-words">
                {message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
