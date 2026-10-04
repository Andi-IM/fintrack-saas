import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../shared/api'
import type { InvestmentOverview, InvestmentAccountSummary, HoldingWithValue } from '../shared/types'
import { PortfolioHeader } from './components/PortfolioHeader'
import { PortfolioSummary } from './components/PortfolioSummary'
import { AccountsList } from './components/AccountsList'
import { TopHoldingsList } from './components/TopHoldingsList'
import { LoadingState } from './components/LoadingState'
import { ErrorState } from './components/ErrorState'
import { EmptyState } from './components/EmptyState'
import { SettingsButton, RefreshButton, SignOutButton, OpenAppButton } from './components/ToolbarButtons'

export function App() {
  const [overview, setOverview] = useState<InvestmentOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cached, setCached] = useState(false)

  const fetchPortfolio = useCallback(async () => {
    try {
      setError(null)
      const response = await chrome.runtime.sendMessage({ type: 'GET_PORTFOLIO' })
      if (response.success) {
        setOverview(response.data)
        setCached(response.cached)
      } else {
        setError(response.error || 'Failed to load portfolio')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await chrome.runtime.sendMessage({ type: 'REFRESH_PORTFOLIO' })
      await fetchPortfolio()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'SIGN_OUT' })
      setOverview(null)
      setError('Signed out. Click to sign in again.')
    } catch (err) {
      setError('Sign out failed')
    }
  }

  const handleOpenApp = () => {
    chrome.tabs.create({ url: 'https://fintrek.web.id/investments' })
  }

  if (loading && !overview) {
    return <LoadingState />
  }

  if (error && !overview) {
    return <ErrorState message={error} onRetry={fetchPortfolio} onSignIn={handleOpenApp} />
  }

  if (!overview) {
    return <EmptyState onSignIn={handleOpenApp} />
  }

  return (
    <div className="app">
      <PortfolioHeader 
        totalValue={overview.totalValue}
        totalGainLoss={overview.totalGainLoss}
        totalGainLossPct={overview.totalGainLossPct}
        dayChange={overview.dayChange}
        dayChangePct={overview.dayChangePct}
        cached={cached}
      />
      
      <PortfolioSummary 
        totalValue={overview.totalValue}
        totalCost={overview.totalCost}
        totalGainLoss={overview.totalGainLoss}
        totalGainLossPct={overview.totalGainLossPct}
        dayChange={overview.dayChange}
        dayChangePct={overview.dayChangePct}
      />

      <div className="section">
        <AccountsList accounts={overview.accounts} />
      </div>

      <div className="section">
        <TopHoldingsList holdings={overview.topHoldings} />
      </div>

      <div className="toolbar">
        <SettingsButton />
        <RefreshButton onClick={handleRefresh} disabled={loading} />
        <SignOutButton onClick={handleSignOut} />
        <OpenAppButton onClick={handleOpenApp} />
      </div>
    </div>
  )
}