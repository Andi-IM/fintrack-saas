'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getNavigationContext, NAV_ITEMS } from './navigation'

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { activeSection } = getNavigationContext(pathname, searchParams)

  return (
    <aside className="hidden md:flex w-20 lg:w-64 bg-white border-r border-slate-200 shrink-0 flex-col p-4 z-10 transition-all duration-300">
      <nav aria-label="Navigasi utama" className="flex flex-col gap-2 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.section === activeSection
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              title={item.label}
              className={cn(
                "flex items-center justify-center lg:justify-start gap-0 lg:gap-3 px-0 lg:px-4 py-3 rounded-xl text-sm font-bold transition-all",
                active
                  ? "bg-indigo-50 text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <Icon className="w-6 h-6 lg:w-5 lg:h-5" />
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
