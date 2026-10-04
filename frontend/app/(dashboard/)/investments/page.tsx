import { Suspense } from 'react'
import { PortfolioSummaryCards, PortfolioSummaryCardsSkeleton, HoldingsTable, AccountSummaryCard } from '@/features/investments/components/PortfolioComponents'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getInvestmentOverview() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/investments/overview`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Failed to fetch')
  const result = await response.json()
  return result.success ? result.data : null
}

export default async function InvestmentsOverviewPage() {
  const overview = await getInvestmentOverview()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investments</h1>
          <p className="text-muted-foreground">Track your investment portfolio performance</p>
        </div>
        <Link href="/investments/accounts/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </Link>
      </div>

      <Suspense fallback={<PortfolioSummaryCardsSkeleton />}>
        <PortfolioSummaryCards />
      </Suspense>

      {overview && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Accounts Overview</CardTitle>
              <Link href="/investments/accounts">
                <Button variant="ghost" size="sm">
                  View All <ExternalLink className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {overview.accounts.map((account: typeof overview.accounts[0]) => (
                  <AccountSummaryCard key={account.id} account={account} />
                ))}
                {overview.accounts.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No investment accounts yet. <Link href="/investments/accounts/new" className="text-indigo-600 hover:underline">Create one</Link> to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top Holdings</CardTitle>
              <Link href="/investments/holdings">
                <Button variant="ghost" size="sm">
                  View All <ExternalLink className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {overview.topHoldings.length > 0 ? (
                <HoldingsTable holdings={overview.topHoldings} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No holdings yet. Add transactions to your accounts to see them here.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}