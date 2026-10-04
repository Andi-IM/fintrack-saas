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
    statusEl.textContent = 'Mengirim data ke FinTrack...'

    try {
      const response = await fetch('https://fintrek.web.id/api/investments/sync/bibit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))

      if (response.ok && result.success) {
        statusEl.style.color = '#34d399'
        statusEl.textContent = '✓ Berhasil disinkronkan ke FinTrack!'
        syncBtn.textContent = 'Tersinkron'
        setTimeout(() => {
          toastElement?.remove()
          toastElement = null
        }, 3000)
      } else {
        throw new Error(result.error || `HTTP ${response.status}`)
      }
    } catch (err: any) {
      statusEl.style.color = '#f87171'
      statusEl.textContent = `Gagal sinkron: ${err.message}. Pastikan sudah login di FinTrack.`
      syncBtn.disabled = false
      syncBtn.textContent = 'Coba Lagi'
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
    if (!isValidBibitPayload(payload)) return

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
