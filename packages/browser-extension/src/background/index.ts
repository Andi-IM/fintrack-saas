import { getFinTrackSession, getFinTrackSessionWithDiagnostics, isSessionExpired } from '../shared/auth'

// Content scripts run in an untrusted context; they need explicit access to
// session storage to cache the captured Bibit portfolio payload.
async function ensureSessionStorageAccess(): Promise<void> {
  try {
    if (chrome.storage?.session?.setAccessLevel) {
      await chrome.storage.session.setAccessLevel({
        accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
      })
    }
  } catch {
    // Older browsers may not support session storage access levels
  }
}

async function handleGetAuthToken(sendResponse: (response: unknown) => void): Promise<void> {
  console.log('[FinTrack Background] Handling GET_AUTH_TOKEN request...')
  try {
    // 1. Check if user configured a persistent FinTrack Sync API Key (Recommended)
    try {
      const storage = await chrome.storage.local.get(['fintrack_api_key'])
      const storedApiKey = storage?.fintrack_api_key?.trim()
      if (storedApiKey && storedApiKey.startsWith('ft_sync_')) {
        console.log('[FinTrack Background] Using configured Personal Sync API Key from extension storage')
        sendResponse({
          success: true,
          apiKey: storedApiKey,
          authType: 'api_key',
          apiUrl: 'https://fintrek.web.id/api/investments/sync/bibit',
        })
        return
      }
    } catch (storageErr) {
      console.warn('[FinTrack Background] Error reading API key from storage:', storageErr)
    }

    // 2. Fallback to Supabase cookie session if no API Key is configured
    const authResult = await getFinTrackSessionWithDiagnostics()
    let session = authResult.session

    if (!session) {
      console.warn('[FinTrack Background] No session found. Discovered cookies:', authResult.discoveredCookies)
      const detailMsg = authResult.discoveredCookies.length > 0
        ? `Belum login di FinTrack. Cookie yang terdeteksi: ${authResult.discoveredCookies.join('; ')}`
        : 'Belum login di FinTrack. Tidak ada cookie FinTrack yang ditemukan di browser ini. Buka fintrek.web.id dan login di profil browser yang sama.'
      sendResponse({
        success: false,
        error: detailMsg,
      })
      return
    }
    if (isSessionExpired(session)) {
      console.warn('[FinTrack Background] Session expired at', session.expiresAt, '- attempting background refresh...')
      try {
        const refreshTarget = 'https://fintrek.web.id/investments'
        await fetch(refreshTarget, { method: 'GET', credentials: 'include' })
        const refreshed = await getFinTrackSession()
        if (refreshed && !isSessionExpired(refreshed)) {
          console.log('[FinTrack Background] Session refreshed successfully in background!')
          session = refreshed
        }
      } catch (refreshErr) {
        console.warn('[FinTrack Background] Background session refresh failed:', refreshErr)
      }
    }

    if (isSessionExpired(session)) {
      console.warn(
        `[FinTrack Background] Token appears expired (expiresAt: ${session.expiresAt}, now: ${Math.floor(Date.now() / 1000)}), forwarding to backend for server-side verification...`
      )
    }

    const apiUrl = 'https://fintrek.web.id/api/investments/sync/bibit'

    console.log('[FinTrack Background] Auth token obtained successfully from', session.domain, 'for sync target:', apiUrl)
    sendResponse({
      success: true,
      token: session.accessToken,
      refreshToken: session.refreshToken,
      apiUrl,
      cookieSource: session.domain,
      discoveredCookies: authResult.discoveredCookies,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token lookup failed'
    console.error('[FinTrack Background] Error while obtaining auth token:', error)
    sendResponse({ success: false, error: message })
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureSessionStorageAccess()
})

chrome.runtime.onStartup.addListener(() => {
  void ensureSessionStorageAccess()
})

// Launch the independent web app investment feature when the toolbar icon is clicked
chrome.action.onClicked.addListener(async () => {
  await chrome.tabs.create({ url: 'https://fintrek.web.id/investments' })
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_AUTH_TOKEN') {
    void handleGetAuthToken(sendResponse)
    return true
  }
  return false
})

export { ensureSessionStorageAccess, handleGetAuthToken }
