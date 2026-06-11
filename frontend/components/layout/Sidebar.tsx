'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Camera, Building2 } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col p-4 z-10 hidden md:flex">
      <nav className="flex flex-col gap-2 flex-1">
        <Link 
          href="/" 
          className={["flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", pathname === "/" ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"].join(" ")}
        >
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Link>
        <Link 
          href="/transactions" 
          className={["flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", pathname.startsWith("/transactions") || pathname === "/add" ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"].join(" ")}
        >
          <FileText className="w-5 h-5" />
          Transactions
        </Link>
        <Link 
          href="/statements" 
          className={["flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", pathname.startsWith("/statements") ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"].join(" ")}
        >
          <Building2 className="w-5 h-5" />
          Bank Statements
        </Link>
        <Link 
          href="/receipts" 
          className={["flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", pathname.startsWith("/receipts") ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"].join(" ")}
        >
          <Camera className="w-5 h-5" />
          Receipts
        </Link>

        <div className="my-4 border-t border-slate-100"></div>
        <h4 className="text-xs font-bold text-slate-400 mb-2 px-4 uppercase tracking-wider">TOOLS</h4>
        
        <Link 
          href="/add?scan=BankStatement"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-700 w-full text-left"
        >
          <FileText className="w-5 h-5" />
          Bank Statement
        </Link>
        <Link 
          href="/add?scan=Receipt"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-700 w-full text-left"
        >
          <Camera className="w-5 h-5" />
          Scan Receipt
        </Link>
      </nav>
    </aside>
  )
}
