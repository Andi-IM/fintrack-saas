'use client'

import { useBankStatements } from '@/features/bank-statements/hooks/use-bank-statements'
import { BankStatementListView } from './BankStatementListView'

export default function BankStatementList() {
  const state = useBankStatements()
  return <BankStatementListView {...state} />
}
