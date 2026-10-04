import type { InvestmentOverview, ExtensionSettings, StoredAuth } from './types'
import { DEFAULT_SETTINGS } from './constants'

const API_BASE_URL = 'https://fintrek.web.id/api/extension'

class ExtensionApiClient {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async initialize(): Promise<void> {
    const stored = await this.getStoredAuth()
    if (stored) {
      this.accessToken = stored.accessToken
      this.refreshToken = stored.refreshToken
      // Check if token is expired and refresh if needed
      if (stored.expiresAt < Date.now() + 60000) {
        await this.refreshAccessToken()
      }
    }
  }

  private async getStoredAuth(): Promise<StoredAuth | null> {
    return new Promise((resolve) => {
      chrome.storage.session.get(['fintrack_auth'], (result) => {
        resolve(result.fintrack_auth || null)
      })
    })
  }

  private async storeAuth(auth: StoredAuth): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.session.set({ fintrack_auth: auth }, resolve)
    })
  }

  private async clearAuth(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.session.remove('fintrack_auth', resolve)
    })
  }

  async setSession(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    await this.storeAuth({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      userId: '', // Will be extracted from token if needed
    })
  }

  async signOut(): Promise<void> {
    this.accessToken = null
    this.refreshToken = null
    await this.clearAuth()
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false

    try {
      const response = await fetch(`${this.baseUrl.replace('/extension', '')}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.refreshToken}`,
        },
      })

      if (!response.ok) throw new Error('Token refresh failed')

      const data = await response.json()
      if (data.access_token && data.refresh_token) {
        await this.setSession(data.access_token, data.refresh_token, data.expires_in || 3600)
        return true
      }
      return false
    } catch (error) {
      console.error('Token refresh error:', error)
      await this.signOut()
      return false
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    })

    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        // Retry with new token
        return this.request(endpoint, options)
      }
      throw new Error('Authentication expired')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async getPortfolioSummary(): Promise<InvestmentOverview> {
    return this.request<InvestmentOverview>('/portfolio-summary')
  }

  async getSettings(): Promise<ExtensionSettings> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['fintrack_settings'], (result) => {
        resolve({ ...DEFAULT_SETTINGS, ...result.fintrack_settings })
      })
    })
  }

  async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await this.getSettings()
    const updated = { ...current, ...settings }
    return new Promise((resolve) => {
      chrome.storage.sync.set({ fintrack_settings: updated }, resolve)
    })
  }

  isAuthenticated(): boolean {
    return !!this.accessToken
  }
}

export const apiClient = new ExtensionApiClient()