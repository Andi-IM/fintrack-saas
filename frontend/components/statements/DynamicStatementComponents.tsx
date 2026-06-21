'use client'

import dynamic from 'next/dynamic'
import { StatementAnalyticsSkeleton, BankStatementListSkeleton } from '@/components/ui/statements-skeleton'

export const StatementAnalyticsLazy = dynamic(
  () => import('./StatementAnalytics'),
  { 
    ssr: false,
    loading: () => <StatementAnalyticsSkeleton />
  }
)

export const BankStatementListLazy = dynamic(
  () => import('@/features/bank-statements/components/BankStatementList'),
  { 
    ssr: false, 
    loading: () => <BankStatementListSkeleton /> 
  }
)
