'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginWithCredentials, signUpWithCredentials } from '@/features/auth/actions/auth'

const authSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal harus 6 karakter'),
})

type AuthFormValues = z.infer<typeof authSchema>

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: 'authorized@example.com',
      password: 'password123',
    },
  })

  const onSubmit = async (data: AuthFormValues) => {
    setLoading(true)
    setServerError(null)
    try {
      const result = await loginWithCredentials(data)
      if (!result.success) {
        setServerError(result.error)
        return
      }
      // Success will trigger NextJS redirect, which is handled
    } catch (err) {
      console.error(err)
      setServerError('Terjadi kesalahan yang tidak terduga.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 w-full">
      {serverError && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 bg-rose-950/40 text-rose-300 rounded-xl text-sm font-medium border border-rose-900/60 text-center break-words shadow-lg"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Email
          </Label>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-indigo-400" />
            <Input
              id="email"
              type="email"
              placeholder="nama@email.com"
              {...register('email')}
              className="h-12 pl-11 pr-4 bg-slate-900/40 border-slate-800 hover:border-slate-700 focus-visible:ring-1 focus-visible:ring-indigo-500 text-white rounded-xl placeholder:text-slate-600 transition-all font-sans"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
          </div>
          {errors.email && (
            <p id="email-error" className="text-xs text-rose-400 font-semibold" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Kata Sandi
          </Label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-indigo-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password')}
              className="h-12 pl-11 pr-11 bg-slate-900/40 border-slate-800 hover:border-slate-700 focus-visible:ring-1 focus-visible:ring-indigo-500 text-white rounded-xl placeholder:text-slate-600 transition-all font-mono"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-xs text-rose-400 font-semibold" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-sm font-bold bg-white hover:bg-slate-100 text-slate-950 rounded-xl transition-all shadow-lg hover:shadow-white/10 flex items-center justify-center gap-2 border border-slate-200 mt-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-950" />}
          Masuk ke Vault
        </Button>
      </form>
    </div>
  )
}
