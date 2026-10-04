import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Popular crypto symbols
const CRYPTO_SYMBOLS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'DOGE', 'AVAX', 'MATIC',
  'LINK', 'UNI', 'LTC', 'BCH', 'ATOM', 'ETC', 'FIL', 'TRX', 'XLM', 'VET',
]

async function fetchCoinGeckoPrices(symbols: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>()
  
  // CoinGecko free API - no key required, rate limited to 10-30 calls/min
  const ids = symbols.map(s => s.toLowerCase()).join(',')
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=idr,usd`
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FinTrack/1.0' },
    })
    
    if (response.ok) {
      const data = await response.json()
      for (const [id, priceData] of Object.entries(data)) {
        const symbol = id.toUpperCase()
        if (priceData && typeof priceData === 'object' && 'idr' in priceData) {
          prices.set(symbol, priceData.idr as number)
        }
      }
    } else {
      console.error('CoinGecko API error:', response.status)
    }
  } catch (e) {
    console.error('CoinGecko fetch error:', e)
  }
  
  return prices
}

async function fetchBinancePrices(symbols: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>()
  
  // Binance has IDR pairs for major cryptos
  const symbolsStr = symbols.map(s => `${s}IDR`).join(',')
  const url = `https://api.binance.com/api/v3/ticker/price?symbols=[${symbolsStr}]`
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FinTrack/1.0' },
    })
    
    if (response.ok) {
      const data = await response.json()
      for (const item of data) {
        const symbol = item.symbol.replace('IDR', '')
        prices.set(symbol, parseFloat(item.price))
      }
    }
  } catch (e) {
    console.error('Binance fetch error:', e)
  }
  
  return prices
}

serve(async (req) => {
  const startTime = Date.now()
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  
  try {
    // Get crypto holdings
    const { data: holdings, error: holdingsError } = await supabase
      .from('investment_holdings')
      .select('symbol, asset_class')
      .eq('asset_class', 'crypto')
    
    if (holdingsError) throw holdingsError
    
    const symbols = [...new Set(holdings?.map(h => h.symbol) || [])]
    
    if (symbols.length === 0) {
      // Also check for common crypto symbols if no holdings yet
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No crypto holdings found',
        updated: 0,
        durationMs: Date.now() - startTime,
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    // Try Binance first (has IDR pairs), fallback to CoinGecko
    let prices = await fetchBinancePrices(symbols)
    
    const missingSymbols = symbols.filter(s => !prices.has(s))
    if (missingSymbols.length > 0) {
      const coingeckoPrices = await fetchCoinGeckoPrices(missingSymbols)
      for (const [symbol, price] of coingeckoPrices) {
        prices.set(symbol, price)
      }
    }
    
    // Upsert price snapshots
    const now = new Date().toISOString()
    let updated = 0
    
    for (const [symbol, price] of prices) {
      const { error } = await supabase
        .from('investment_price_snapshots')
        .upsert({
          symbol,
          asset_class: 'crypto',
          price,
          currency: 'IDR',
          source: 'binance',
          timestamp: now,
        }, { onConflict: 'symbol,asset_class,source,timestamp' })
      
      if (!error) updated++
    }
    
    // Refresh portfolio snapshots
    const { data: users } = await supabase
      .from('investment_holdings')
      .select('user_id')
      .in('symbol', Array.from(prices.keys()))
    
    const uniqueUsers = [...new Set(users?.map(u => u.user_id) || [])]
    
    for (const userId of uniqueUsers) {
      await supabase.rpc('refresh_portfolio_snapshot', { p_user_id: userId })
    }
    
    return new Response(JSON.stringify({
      success: true,
      updated,
      totalSymbols: symbols.length,
      foundSymbols: prices.size,
      durationMs: Date.now() - startTime,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('Crypto price ingestion error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      durationMs: Date.now() - startTime,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})