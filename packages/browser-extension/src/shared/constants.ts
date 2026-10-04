import type { ExtensionSettings } from './types'

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoRefresh: true,
  refreshInterval: 300000, // 5 minutes
  showGainLossColors: true,
  notificationsEnabled: true,
  priceAlerts: false,
  dividendAlerts: true,
}
