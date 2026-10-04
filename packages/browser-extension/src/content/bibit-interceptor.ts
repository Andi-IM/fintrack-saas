// Main-world script injected into app.bibit.id to intercept portfolio API responses
;(function () {
  const SCRIPT_ID = '__FINTRACK_BIBIT_INTERCEPTOR__'
  if ((window as any)[SCRIPT_ID]) return
  ;(window as any)[SCRIPT_ID] = true

  const TARGET_ORIGIN = 'https://app.bibit.id'

  // Intercept window.fetch
  const originalFetch = window.fetch
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args)
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || ''
      if (url.includes('/portfolios') && url.includes('bibit.id')) {
        const clone = response.clone()
        clone.json().then((data) => {
          if (data && data.data && Array.isArray(data.data.result)) {
            window.postMessage(
              {
                type: 'FINTRACK_BIBIT_PORTFOLIO_CAPTURED',
                source: 'bibit_api',
                payload: data,
                timestamp: Date.now(),
              },
              TARGET_ORIGIN
            )
          }
        }).catch(() => {})
      }
    } catch (e) {
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
        if (url.includes('/portfolios') && url.includes('bibit.id')) {
          const data = JSON.parse(this.responseText)
          if (data && data.data && Array.isArray(data.data.result)) {
            window.postMessage(
              {
                type: 'FINTRACK_BIBIT_PORTFOLIO_CAPTURED',
                source: 'bibit_api',
                payload: data,
                timestamp: Date.now(),
              },
              TARGET_ORIGIN
            )
          }
        }
      } catch (e) {
        // Passive
      }
    })
    return originalXhrSend.apply(this, args as any)
  }
})()
