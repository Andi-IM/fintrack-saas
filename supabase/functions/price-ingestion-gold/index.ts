import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Gold symbols: ANTAM, LBMA, etc.
const GOLD_SYMBOLS = ['ANTAM', 'LBMA', 'XAU']

async function fetchAntamGoldPrice(): Promise<number | null> {
  try {
    // ANTAM (Indonesian state-owned precious metals) - they publish daily gold prices
    // This is a mock - actual implementation would scrape or use their API
    const response = await fetch('https://www.logammulia.com/api/gold-price', {
      headers: { 'User-Agent': 'FinTrack/1.0' },
    })
    
    if (response.ok) {
      const data = await response.json()
      // Expected structure: { buyback_price, sell_price } in IDR per gram
      if (data.sell_price) return data.sell_price
    }
  } catch (e) {
    console.error('ANTAM gold price error:', e)
  }
  return null
}

async function fetchLBMAPrice(): Promise<number | null> {
  try {
    // London Bullion Market Association - USD per troy ounce
    // Convert to IDR per gram: 1 troy oz = 31.1035 grams
    const response = await fetch('https://api.gold-api.com/price/XAU', {
      headers: { 'User-Agent': 'FinTrack/1.0' },
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.price) {
        // Convert USD/troy_oz to IDR/gram
        // Need USD/IDR rate - fetch from exchangerate API
        const fxResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
        if (fxResponse.ok) {
          const fxData = await fxResponse.json()
          const usdIdr = fxData.rates?.IDR || 15500
          const idrPerGram = (data.price * usdIdr) / 31.1035
          return Math.round(idrPerGram)
        }
      }
    }
  } catch (e) {
    console.error('LBMA gold price error:', e)
  }
  return null
}

async function fetchGoldPriceOrg(): Promise<number | null> {
  try {
    const response = await fetch('https://goldprice.org/api/gold-price/IDR', {
      headers: { 'User-Agent': 'FinTrack/1.0' },
    })
    
    if (response.ok) {
      const data = await response.json()
      // Parse goldprice.org response
      if (data.price_per_gram) return data.price_per_gram
    }
  } catch (e) {
    console.error('goldprice.org error:', e)
  }
  return null
}

serve(async (req) => {
  const startTime = Date.now()
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  
  try {
    // Get gold/commodity holdings
    const { data: holdings, error: holdingsError } = await supabase
      .from('investment_holdings')
      .select('symbol, asset_class')
      .in('asset_class', ['commodity', 'gold'])
    
    if (holdingsError) throw holdingsError
    
    const symbols = [...new Set(holdings?.map(h => h.symbol) || [])]
    
    if (symbols.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No gold/commodity holdings found',
        updated: 0,
        durationMs: Date.now() - startTime,
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    // Fetch from multiple sources
    const prices = new Map<string, { price: number; source: string }>()
    
    const antamPrice = await fetchAntamGoldPrice()
    if (antamPrice) {
      prices.set('ANTAM', { price: antamPrice, source: 'antam' })
      prices.set('XAU', { price: antamPrice, source: 'antam' })
    }
    
    const lbmaPrice = await fetchLBMAPrice()
    if (lbmaPrice) {
      if (!prices.has('XAU')) {
        prices.set('XAU', { price: lbmaPrice, source: 'lbma' })
      }
      prices.set('LBMA', { price: lbmaPrice, source: 'lbma' })
    }
    
    const goldPriceOrg = await fetchGoldPriceOrg()
    if (goldPriceOrg) {
      if (!prices.has('XAU')) {
        prices.set('XAU', { price: goldPriceOrg, source: 'goldprice_org' })
      }
    }
    
    // Upsert price snapshots
    const now = new Date().toISOString()
    let updated = 0
    
    for (const [symbol, { price, source }] of prices) {
      if (symbols.includes(symbol) || symbols.includes('XAU') || symbols.includes('GOLD')) {
        const { error } = await supabase
          .from('investment_price_snapshots')
          .upsert({
            symbol,
            asset_class: 'commodity',
            price,
            currency: 'IDR',
            source,
            timestamp: now,
          }, { onConflict: 'symbol,asset_class,source,timestamp' })
        
        if (!error) updated++
      }
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
    console.error('Gold price ingestion error:', error)
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