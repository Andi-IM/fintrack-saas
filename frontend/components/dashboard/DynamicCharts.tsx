'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

export const TransactionChartLazy = dynamic(
  () => import('./TransactionChart').then(mod => mod.TransactionChart),
  { ssr: false, loading: () => <Skeleton className="h-[400px] w-full rounded-xl" /> }
)

export const FinancialInsightsLazy = dynamic(
  () => import('./FinancialInsights').then(mod => mod.FinancialInsights),
  { ssr: false, loading: () => <Skeleton className="h-[400px] w-full rounded-xl" /> }
)
