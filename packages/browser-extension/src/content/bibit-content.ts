// Content script running in ISOLATED world on https://app.bibit.id/*
// Receives intercepted portfolio data from bibit-interceptor.ts

import { isValidBibitPayload, type BibitPayload } from '../shared/validation'

const TARGET_ORIGIN = 'https://app.bibit.id'

let toastElement: HTMLElement | null = null

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function isExtensionContextValid(): boolean {
  try {
    return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.sendMessage)
  } catch {
    return false
  }
}

function showToast(payload: BibitPayload) {
  if (toastElement) {
    toastElement.remove()
  }

  const marketValue = payload.data?.marketvalue ?? 0
  const profitLoss = payload.data?.profitloss ?? 0
  const isPositive = profitLoss >= 0

  toastElement = document.createElement('div')
  toastElement.id = 'fintrack-bibit-sync-toast'
  toastElement.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    background: #0f172a;
    color: #ffffff;
    border: 1px solid rgba(99, 102, 241, 0.4);
    border-radius: 12px;
    padding: 16px;
    width: 320px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    animation: fintrack-slide-in 0.3s ease-out;
  `

  toastElement.innerHTML = `
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); font-weight: bold; font-size: 14px;">
          FT
        </span>
        <div>
          <div style="font-weight: 700; font-size: 13px; color: #f8fafc;">FinTrack Sync</div>
          <div style="font-size: 11px; color: #94a3b8;">Portofolio Bibit Terdeteksi</div>
        </div>
      </div>
      <button id="fintrack-toast-close" style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 16px; padding: 0 4px; line-height: 1;">&times;</button>
    </div>

    <div style="margin: 12px 0; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
      <div style="font-size: 11px; color: #94a3b8;">Nilai Portofolio:</div>
      <div style="font-size: 16px; font-weight: 800; color: #ffffff; font-variant-numeric: tabular-nums;">
        ${formatRupiah(marketValue)}
      </div>
      <div style="font-size: 11px; font-weight: 600; color: ${isPositive ? '#34d399' : '#f87171'}; margin-top: 2px;">
        ${isPositive ? '+' : ''}${formatRupiah(profitLoss)}
      </div>
    </div>

    <div style="display: flex; gap: 8px;">
      <button id="fintrack-toast-sync" style="flex: 1; padding: 8px 12px; background: #4f46e5; hover:background: #4338ca; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer; transition: background 0.15s;">
        Sinkronkan ke FinTrack
      </button>
      <button id="fintrack-toast-open" style="padding: 8px 12px; background: rgba(255, 255, 255, 0.1); color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;">
        Buka FinTrack
      </button>
    </div>
    <div id="fintrack-toast-status" style="font-size: 11px; margin-top: 6px; text-align: center; color: #94a3b8; display: none;"></div>
  `

  document.body.appendChild(toastElement)

  toastElement.querySelector('#fintrack-toast-close')?.addEventListener('click', () => {
    toastElement?.remove()
    toastElement = null
  })

  toastElement.querySelector('#fintrack-toast-open')?.addEventListener('click', () => {
    window.open('https://fintrek.web.id/investments', '_blank')
  })

  const syncBtn = toastElement.querySelector('#fintrack-toast-sync') as HTMLButtonElement | null
  const statusEl = toastElement.querySelector('#fintrack-toast-status') as HTMLDivElement | null

  syncBtn?.addEventListener('click', async () => {
    if (!syncBtn || !statusEl) return
    syncBtn.disabled = true
    syncBtn.textContent = 'Menyinkronkan...'
    statusEl.style.display = 'block'
    statusEl.style.color = '#94a3b8'
    statusEl.textContent = 'Meminta autentikasi FinTrack...'

    console.log('[FinTrack Sync] Memulai proses sinkronisasi...')

    try {
      if (!isExtensionContextValid()) {
        throw new Error('Extension baru saja di-reload. Halaman Bibit perlu di-refresh agar terhubung kembali.')
      }

      console.log('[FinTrack Sync] Meminta token auth dari extension background...')
      const tokenResult = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' })
      console.log('[FinTrack Sync] Respon auth token:', tokenResult)

      if (!tokenResult?.success || (!tokenResult.token && !tokenResult.apiKey)) {
        throw new Error(tokenResult?.error || 'Belum terhubung ke FinTrack. Buka popup FinTrack Extension untuk memasukkan Sync API Key atau login di fintrek.web.id.')
      }

      const syncUrl = tokenResult.apiUrl || 'https://fintrek.web.id/api/investments/sync/bibit'
      statusEl.textContent = 'Mengirim data ke FinTrack...'
      console.log('[FinTrack Sync] Mengirim payload ke:', syncUrl, {
        marketValue,
        profitLoss,
        itemCount: payload.data?.result?.length,
        authType: tokenResult.authType || 'cookie',
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (tokenResult.apiKey) {
        headers['x-api-key'] = tokenResult.apiKey
      } else {
        if (tokenResult.token) {
          headers['Authorization'] = `Bearer ${tokenResult.token}`
        }
        if (tokenResult.refreshToken) {
          headers['x-refresh-token'] = tokenResult.refreshToken
        }
      }

      const response = await fetch(syncUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      console.log('[FinTrack Sync] HTTP response status:', response.status)
      const result = await response.json().catch(() => ({}))
      console.log('[FinTrack Sync] HTTP response data:', result)

      if (response.ok && result.success) {
        statusEl.style.color = '#34d399'
        statusEl.textContent = '✓ Berhasil disinkronkan ke FinTrack!'
        syncBtn.textContent = 'Tersinkron'
        console.log('[FinTrack Sync] Sinkronisasi berhasil!')
        setTimeout(() => {
          toastElement?.remove()
          toastElement = null
        }, 3000)
      } else {
        if (response.status === 401) {
          const errorMsg = tokenResult.apiKey
            ? 'API Key FinTrack tidak valid atau telah dicabut (401 Unauthorized). Silakan periksa FinTrack Sync Key di popup extension.'
            : 'Sesi FinTrack telah kadaluarsa di server (401 Unauthorized). Buka popup extension untuk memasukkan Sync Key atau login ulang di fintrek.web.id.'
          throw new Error(errorMsg)
        }
        throw new Error(result.error || `HTTP ${response.status}: Gagal menyimpan portofolio`)
      }
    } catch (err: any) {
      console.error('[FinTrack Sync] Gagal sinkron:', err)
      const stackTrace = err?.stack ? String(err.stack) : ''
      if (stackTrace) {
        console.error('[FinTrack Sync] Stack trace:\n' + stackTrace)
      }

      const errorMsg = String(err?.message || err)
      const isContextInvalidated =
        !isExtensionContextValid() ||
        errorMsg.includes('Extension context invalidated') ||
        errorMsg.includes('sendMessage') ||
        errorMsg.includes('terputus')

      statusEl.style.color = '#f87171'
      syncBtn.disabled = false

      const escapedStack = stackTrace
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      const stackTraceHtml = escapedStack
        ? `<details style="margin-top: 6px; text-align: left; font-size: 10px; color: #94a3b8; cursor: pointer;">
             <summary style="outline: none;">Lihat Stacktrace</summary>
             <pre style="white-space: pre-wrap; word-break: break-all; font-family: monospace; font-size: 9px; margin-top: 4px; max-height: 90px; overflow-y: auto; background: rgba(0, 0, 0, 0.4); padding: 6px; border-radius: 4px; color: #fca5a5;">${escapedStack}</pre>
           </details>`
        : ''

      if (isContextInvalidated) {
        statusEl.innerHTML = `<div>Extension baru di-reload. Halaman Bibit perlu di-refresh agar terhubung kembali.</div>${stackTraceHtml}`
        syncBtn.textContent = 'Refresh Halaman'
        syncBtn.onclick = () => {
          window.location.reload()
        }
      } else {
        statusEl.innerHTML = `<div>Gagal sinkron: ${errorMsg}</div>${stackTraceHtml}`
        syncBtn.textContent = 'Coba Lagi'
      }
    }
  })
}

// Listen for captured payload from main-world interceptor
window.addEventListener('message', (event) => {
  if (event.source !== window) return
  if (event.origin !== TARGET_ORIGIN) return
  if (!event.data) return

  if (event.data.type === 'FINTRACK_BIBIT_PORTFOLIO_CAPTURED') {
    const payload = event.data.payload as BibitPayload
    if (!isValidBibitPayload(payload)) {
      console.warn('[FinTrack Sync] Payload Bibit tidak valid atau tidak lengkap:', event.data.payload)
      return
    }

    console.log('[FinTrack Sync] Portofolio Bibit terdeteksi & tervalidasi:', {
      marketValue: payload.data?.marketvalue,
      profitLoss: payload.data?.profitloss,
      portfoliosCount: payload.data?.result?.length,
    })

    // Save locally in extension session storage (cleared when browser closes)
    try {
      if (chrome?.storage?.session) {
        chrome.storage.session.set({
          fintrack_bibit_portfolio: {
            payload,
            capturedAt: Date.now(),
          },
        })
      }
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'BIBIT_PORTFOLIO_CAPTURED',
          data: payload,
        }).catch(() => {})
      }
    } catch {
      // Ignored
    }

    // Display sync toast
    showToast(payload)
  }
})
