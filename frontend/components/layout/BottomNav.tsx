'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getNavigationContext, NAV_ITEMS } from './navigation'

export function BottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { activeSection } = getNavigationContext(pathname, searchParams)

  return (
    <nav aria-label="Navigasi seluler" className="w-full h-16 shrink-0 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-30 md:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.05)] box-content pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = item.section === activeSection
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all",
              active 
                ? "text-indigo-700 font-bold" 
                : "text-slate-600 font-medium hover:text-slate-800"
            )}
          >
            <Icon className={cn("w-5 h-5", active ? "text-indigo-600" : "text-slate-500")} />
            <span className="text-[11px] font-medium tracking-tight">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
