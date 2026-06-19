'use client'

import { Banknote, LogOut } from 'lucide-react'
import { logout } from '@/features/auth/actions/auth'

export function Topbar({ email }: { email: string | undefined }) {
  return (
    <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-6 flex-shrink-0 z-20 relative">
      <div className="flex items-center gap-2">
        <div className="bg-indigo-600 p-1.5 rounded-md flex items-center justify-center">
          <Banknote className="w-4 h-4 text-white" />
        </div>
        <span className="font-poppins font-bold tracking-tight text-lg">FinTrack <span className="text-indigo-600 italic">SaaS</span></span>
      </div>
      <div className="flex items-center gap-4">
        {email && (
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-xs font-semibold text-emerald-700">{email}</span>
          </div>
        )}
        <form action={logout}>
          <button type="submit" className="text-slate-400 hover:text-slate-600 transition-colors flex items-center">
            <LogOut className="w-5 h-5" />
          </button>
        </form>
      </div>
    </header>
  )
}
