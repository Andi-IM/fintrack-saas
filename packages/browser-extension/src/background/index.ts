import { apiClient } from '../shared/api'
import type { ExtensionSettings } from '../shared/types'

const ALARM_NAME = 'portfolio-refresh'
const BADGE_COLORS = {
  positive: '#16a34a', // green-600
  negative: '#dc2626', // red-600
  neutral: '#6b7280',  // gray-500
}

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  await apiClient.initialize()
  await setupAlarms()
  if (apiClient.isAuthenticated()) {
    await refreshPortfolioData()
  } else {
    updateBadge('neutral', '')
  }
})

chrome.runtime.onStartup.addListener(async () => {
  await apiClient.initialize()
  await setupAlarms()
  if (apiClient.isAuthenticated()) {
    await refreshPortfolioData()
  } else {
    updateBadge('neutral', '')
  }
})

// Launch independent web app investment feature when toolbar icon is clicked
chrome.action.onClicked.addListener(async () => {
  await chrome.tabs.create({ url: 'https://fintrek.web.id/investments' })
})

// Alarm setup
async function setupAlarms(): Promise<void> {
  const settings = await apiClient.getSettings()
  if (settings.autoRefresh) {
    await chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: Math.max(1, Math.floor(settings.refreshInterval / 60000)),
    })
  } else {
    await chrome.alarms.clear(ALARM_NAME)
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await refreshPortfolioData()
  }
})

// Badge management
function updateBadge(status: 'loading' | 'error' | 'positive' | 'negative' | 'neutral', text?: string): void {
  const colors: Record<string, string> = {
    loading: BADGE_COLORS.neutral,
    error: BADGE_COLORS.negative,
    positive: BADGE_COLORS.positive,
    negative: BADGE_COLORS.negative,
    neutral: BADGE_COLORS.neutral,
  }

  chrome.action.setBadgeBackgroundColor({ color: colors[status] })
  chrome.action.setBadgeText({ text: text || '' })
}

// Portfolio data refresh
async function refreshPortfolioData(): Promise<void> {
  if (!apiClient.isAuthenticated()) {
    updateBadge('neutral', '')
    return
  }

  updateBadge('loading', '...')

  try {
    const overview = await apiClient.getPortfolioSummary()
    
    // Update badge with day change
    const dayChangePct = overview.dayChangePct
    if (dayChangePct > 0.1) {
      updateBadge('positive', `+${dayChangePct.toFixed(1)}%`)
    } else if (dayChangePct < -0.1) {
      updateBadge('negative', `${dayChangePct.toFixed(1)}%`)
    } else {
      updateBadge('neutral', '0%')
    }

    // Check for price alerts
    await checkPriceAlerts(overview)

    // Store cached data for popup
    await chrome.storage.session.set({
      fintrack_portfolio_cache: {
        data: overview,
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    console.error('Failed to refresh portfolio:', error)
    updateBadge('error', '!')
  }
}

async function checkPriceAlerts(overview: any): Promise<void> {
  const settings = await apiClient.getSettings()
  if (!settings.notificationsEnabled || !settings.priceAlerts) return

  const notifiedKeys = await getNotifiedKeys()
  const now = Date.now()

  for (const holding of overview.topHoldings) {
    const gainLossPct = holding.gainLossPct
    const key = `${holding.id}-${gainLossPct > 0 ? 'up' : 'down'}`

    // Alert on 5%+ moves
    if (Math.abs(gainLossPct) >= 5 && !notifiedKeys.has(key)) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: `${gainLossPct > 0 ? '📈' : '📉'} Price Alert: ${holding.symbol}`,
        message: `${holding.name} is ${gainLossPct > 0 ? 'up' : 'down'} ${Math.abs(gainLossPct).toFixed(2)}% today`,
        priority: 1,
      })
      notifiedKeys.add(key)
    }
  }

  // Clean old notifications (older than 24 hours)
  const cutoff = now - 24 * 60 * 60 * 1000
  const recentKeys = new Set([...notifiedKeys].filter(k => {
    const timestamp = parseInt(k.split('-').pop() || '0')
    return timestamp > cutoff
  }))
  await saveNotifiedKeys(recentKeys)
}

async function getNotifiedKeys(): Promise<Set<string>> {
  return new Promise((resolve) => {
    chrome.storage.session.get(['fintrack_notified'], (result) => {
      resolve(new Set(result.fintrack_notified || []))
    })
  })
}

async function saveNotifiedKeys(keys: Set<string>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.session.set({ fintrack_notified: [...keys] }, resolve)
  })
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PORTFOLIO') {
    handleGetPortfolio(sendResponse)
    return true
  }
  if (message.type === 'REFRESH_PORTFOLIO') {
    refreshPortfolioData().then(() => sendResponse({ success: true }))
    return true
  }
  if (message.type === 'SIGN_OUT') {
    apiClient.signOut().then(() => sendResponse({ success: true }))
    return true
  }
})

async function handleGetPortfolio(sendResponse: (response: any) => void): Promise<void> {
  try {
    // Try cache first
    const cached = await new Promise<any>((resolve) => {
      chrome.storage.session.get(['fintrack_portfolio_cache'], (result) => {
        resolve(result.fintrack_portfolio_cache)
      })
    })

    if (cached && Date.now() - cached.timestamp < 60000) {
      sendResponse({ success: true, data: cached.data, cached: true })
      return
    }

    // Fetch fresh
    const overview = await apiClient.getPortfolioSummary()
    sendResponse({ success: true, data: overview, cached: false })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}

// Handle auth state changes
chrome.identity.onSignInChanged.addListener(async (account, signedIn) => {
  if (!signedIn) {
    await apiClient.signOut()
    updateBadge('neutral', '!')
  }
})

// Export for testing
export { apiClient, refreshPortfolioData, updateBadge }