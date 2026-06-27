'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutDashboard, FileText, Camera, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isScanReceipt = pathname === '/add' && searchParams?.get('scan') === 'Receipt'

  return (
    <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col p-4 z-10 hidden md:flex transition-all duration-300">
      <nav className="flex flex-col gap-2 flex-1">
        <Link 
          href="/" 
          title="Dashboard"
          className={cn("flex items-center justify-center lg:justify-start gap-0 lg:gap-3 px-0 lg:px-4 py-3 rounded-xl text-sm font-bold transition-all", pathname === "/" ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
        >
          <LayoutDashboard className="w-6 h-6 lg:w-5 lg:h-5" />
          <span className="hidden lg:block">Dashboard</span>
        </Link>
        <Link 
          href="/transactions" 
          title="Transactions"
          className={cn("flex items-center justify-center lg:justify-start gap-0 lg:gap-3 px-0 lg:px-4 py-3 rounded-xl text-sm font-bold transition-all", pathname?.startsWith("/transactions") || (pathname === "/add" && !isScanReceipt) ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
        >
          <FileText className="w-6 h-6 lg:w-5 lg:h-5" />
          <span className="hidden lg:block">Transactions</span>
        </Link>
        <Link 
          href="/statements" 
          title="Bank Statements"
          className={cn("flex items-center justify-center lg:justify-start gap-0 lg:gap-3 px-0 lg:px-4 py-3 rounded-xl text-sm font-bold transition-all", pathname?.startsWith("/statements") ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
        >
          <Building2 className="w-6 h-6 lg:w-5 lg:h-5" />
          <span className="hidden lg:block">Bank Statements</span>
        </Link>
        <Link 
          href="/receipts" 
          title="Receipts"
          className={cn("flex items-center justify-center lg:justify-start gap-0 lg:gap-3 px-0 lg:px-4 py-3 rounded-xl text-sm font-bold transition-all", pathname?.startsWith("/receipts") || isScanReceipt ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
        >
          <Camera className="w-6 h-6 lg:w-5 lg:h-5" />
          <span className="hidden lg:block">Receipts</span>
        </Link>
      </nav>
    </aside>
  )
}
