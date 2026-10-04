import { getFinTrackSession, isSessionExpired } from '../shared/auth'

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
  try {
    const session = await getFinTrackSession()
    if (!session) {
      sendResponse({ success: false, error: 'Not authenticated' })
      return
    }
    if (isSessionExpired(session)) {
      sendResponse({ success: false, error: 'Session expired' })
      return
    }
    sendResponse({ success: true, token: session.accessToken })
  } catch (error) {
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Token lookup failed' })
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
