// Content script for injecting portfolio widget into FinTrack web app
// Runs on https://fintrek.web.id/*

interface InvestmentOverview {
  totalValue: number
  dayChange: number
  dayChangePct: number
}

let widget: HTMLDivElement | null = null
let isEnabled = true

// Initialize
async function init(): Promise<void> {
  const result = await chrome.storage.sync.get(['fintrack_widget_enabled'])
  isEnabled = result.fintrack_widget_enabled !== false
  
  if (isEnabled) {
    injectWidget()
    startPeriodicUpdate()
  }
}

function injectWidget(): void {
  if (widget || !isEnabled) return

  widget = document.createElement('div')
  widget.id = 'fintrack-extension-widget'
  widget.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 280px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    overflow: hidden;
  `
  
  widget.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span style="font-weight: 600; font-size: 13px;">FinTrack Portfolio</span>
      </div>
      <button id="fintrack-widget-close" style="background: none; border: none; color: #fff; cursor: pointer; padding: 4px; border-radius: 4px; opacity: 0.8;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
    <div id="fintrack-widget-content" style="padding: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Portfolio Value</span>
        <button id="fintrack-widget-refresh" style="background: none; border: none; color: #6b7280; cursor: pointer; padding: 4px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>
      <div id="fintrack-widget-value" style="font-size: 24px; font-weight: 700; color: #1f2937; font-variant-numeric: tabular-nums;">Loading...</div>
      <div id="fintrack-widget-change" style="margin-top: 4px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 4px;">Loading...</div>
    </div>
  `

  document.body.appendChild(widget)

  // Close button
  widget.querySelector('#fintrack-widget-close')?.addEventListener('click', () => {
    widget?.remove()
    widget = null
    chrome.storage.sync.set({ fintrack_widget_enabled: false })
  })

  // Refresh button
  widget.querySelector('#fintrack-widget-refresh')?.addEventListener('click', fetchAndUpdate)

  fetchAndUpdate()
}

async function fetchAndUpdate(): Promise<void> {
  if (!widget) return

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_PORTFOLIO' })
    if (response.success && response.data) {
      updateWidget(response.data)
    }
  } catch (error) {
    console.error('Failed to fetch portfolio:', error)
  }
}

function updateWidget(data: any): void {
  if (!widget) return

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const valueEl = widget.querySelector('#fintrack-widget-value')
  const changeEl = widget.querySelector('#fintrack-widget-change')

  if (valueEl) {
    valueEl.textContent = formatCurrency(data.totalValue)
  }

  if (changeEl) {
    const isPositive = data.dayChange >= 0
    changeEl.innerHTML = `
      <span style="color: ${isPositive ? '#16a34a' : '#dc2626'};">
        ${isPositive ? '+' : ''}${formatCurrency(data.dayChange)} (${isPositive ? '+' : ''}${data.dayChangePct.toFixed(2)}%)
      </span>
    `
  }
}

function startPeriodicUpdate(): void {
  setInterval(fetchAndUpdate, 5 * 60 * 1000) // 5 minutes
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PORTFOLIO_UPDATED' && widget) {
    updateWidget(message.data)
  }
})

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}