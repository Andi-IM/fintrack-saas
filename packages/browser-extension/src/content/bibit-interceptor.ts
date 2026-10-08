// Main-world script injected into app.bibit.id to intercept portfolio API responses
;(function () {
  const SCRIPT_ID = '__FINTRACK_BIBIT_INTERCEPTOR__'
  if ((window as any)[SCRIPT_ID]) return
  ;(window as any)[SCRIPT_ID] = true

  const TARGET_ORIGIN = 'https://app.bibit.id'

  function classify(url: string): 'portfolio' | 'rdn' | null {
    if (!url.includes('bibit.id')) return null
    // Current API: /portfolios/category/<id>?v=4 ; legacy: /portfolios?v=4
    if (/\/portfolios(\/|\?|$)/.test(url)) return 'portfolio'
    // RDN cash balance: /rdn?v=3
    if (/\/rdn(\/|\?|$)/.test(url)) return 'rdn'
    return null
  }

  function isRecognizable(kind: 'portfolio' | 'rdn', data: any): boolean {
    if (!data || typeof data !== 'object' || !data.data || typeof data.data !== 'object') return false
    const payload = data.data
    if (kind === 'portfolio') {
      return Array.isArray(payload.results) || Array.isArray(payload.result)
    }
    return (
      typeof payload.trading_balance === 'number' ||
      typeof payload.cash_on_hand === 'number' ||
      typeof payload.withdrawal_balance === 'number'
    )
  }

  function relay(kind: 'portfolio' | 'rdn', url: string, data: any) {
    if (!isRecognizable(kind, data)) return
    console.log(`[FinTrack Interceptor] Intercepted Bibit ${kind} response:`, url)
    window.postMessage(
      {
        type: 'FINTRACK_BIBIT_PORTFOLIO_CAPTURED',
        source: kind === 'rdn' ? 'bibit_rdn' : 'bibit_api',
        payload: data,
        timestamp: Date.now(),
      },
      TARGET_ORIGIN
    )
  }

  // Intercept window.fetch
  const originalFetch = window.fetch
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args)
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || ''
      const kind = classify(url)
      if (kind) {
        const clone = response.clone()
        clone
          .json()
          .then((data) => relay(kind, url, data))
          .catch(() => {})
      }
    } catch {
      // Passive interception should never break host app
    }
    return response
  }

  // Intercept XMLHttpRequest
  const originalXhrOpen = XMLHttpRequest.prototype.open
  const originalXhrSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
    ;(this as any)._fintrack_url = typeof url === 'string' ? url : url.toString()
    return originalXhrOpen.apply(this, [method, url, ...rest] as any)
  }

  XMLHttpRequest.prototype.send = function (...args: any[]) {
    this.addEventListener('load', function () {
      try {
        const url = (this as any)._fintrack_url || ''
        const kind = classify(url)
        if (kind) {
          relay(kind, url, JSON.parse(this.responseText))
        }
      } catch {
        // Passive
      }
    })
    return originalXhrSend.apply(this, args as any)
  }
})()
