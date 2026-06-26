import { login } from '@/features/auth/actions/auth'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LockIcon } from 'lucide-react'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const { message } = await searchParams

  const isLocalSupabase = process.env.NODE_ENV === 'development' || !process.env.VERCEL

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
          {isLocalSupabase ? (
            <>
              <LoginForm defaultEmail={process.env.AUTHORIZED_EMAIL} />
              {message && (
                <div className="mt-4 p-4 bg-rose-950/40 text-rose-300 rounded-xl text-sm font-medium border border-rose-900/60 text-center break-words">
                  {message}
                </div>
              )}
            </>
          ) : (
            <form action={login} className="space-y-6">
              <Button
                type="submit"
                className="w-full h-12 text-sm font-bold bg-white hover:bg-slate-100 text-slate-950 rounded-xl transition-all shadow-lg shadow-white/5 flex items-center justify-center gap-3 border border-slate-200"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-950">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Continue with GitHub
              </Button>

              {message && (
                <div className="p-4 bg-rose-950/40 text-rose-300 rounded-xl text-sm font-medium border border-rose-900/60 text-center break-words">
                  {message}
                </div>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
