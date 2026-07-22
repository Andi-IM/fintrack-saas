'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getNavigationContext } from './navigation'

export function Breadcrumbs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { breadcrumbs } = getNavigationContext(pathname, searchParams)

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
      <ol className="flex min-w-0 flex-wrap items-center gap-1">
        {breadcrumbs.map((item, index) => {
          const isCurrent = index === breadcrumbs.length - 1

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />}
              {item.href && !isCurrent ? (
                <Link href={item.href} className="truncate font-medium text-slate-500 transition-colors hover:text-slate-900">
                  {item.label}
                </Link>
              ) : (
                <span className="truncate font-semibold text-slate-900" aria-current={isCurrent ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
