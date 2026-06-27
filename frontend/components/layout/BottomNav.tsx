'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutDashboard, FileText, Camera, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isScanReceipt = pathname === '/add' && searchParams?.get('scan') === 'Receipt'

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/'
    },
    {
      label: 'Transaksi',
      href: '/transactions',
      icon: FileText,
      active: pathname?.startsWith('/transactions') || (pathname === '/add' && !isScanReceipt)
    },
    {
      label: 'Bank',
      href: '/statements',
      icon: Building2,
      active: !!pathname?.startsWith('/statements')
    },
    {
      label: 'Struk',
      href: '/receipts',
      icon: Camera,
      active: !!pathname?.startsWith('/receipts') || isScanReceipt
    }
  ]

  return (
    <nav className="w-full h-16 shrink-0 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-30 md:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.05)] box-content pb-[env(safe-area-inset-bottom)]">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all",
              item.active 
                ? "text-indigo-700 font-bold" 
                : "text-slate-500 font-medium hover:text-slate-700"
            )}
          >
            <Icon className={cn("w-5 h-5", item.active ? "text-indigo-600" : "text-slate-400")} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
