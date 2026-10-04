import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const IDX_STOCKS = [
  'BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'UNVR', 'ICBP', 'INDF', 'KLBF',
  'SMGR', 'EXCL', 'PGAS', 'ADRO', 'PTBA', 'ITMG', 'UNTR', 'MDKA', 'ANTM', 'INCO',
  'TINS', 'SMDR', 'MBMA', 'AALI', 'LSIP', 'SIMP', 'SSMS', 'BUMI', 'ITMG', 'PTBA',
  'GOTO', 'BUKA', 'ARTO', 'EMTK', 'MIKA', 'RAJA', 'SIDO', 'KAEF', 'SKLT', 'TCID',
]

async function fetchIdxPrices(symbols: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>()
  
  // Try IDX API first (if available)
  // Fallback: yfinance via a simple HTTP call or use a free API
  // For now, we'll use a mock approach - in production you'd integrate with:
  // - IDX official API
  // - yfinance (via a proxy service)
  // - Twelve Data, Alpha Vantage, or similar
  
  // Using a public API that provides IDX data
  const apiUrl = `https://api.binance.com/api/v3/ticker/price?symbols=[${symbols.map(s => `"${s}IDR"`).join(',')}]`
  
  try {
    const response = await fetch(apiUrl)
    if (response.ok) {
      const data = await response.json()
      for (const item of data) {
        const symbol = item.symbol.replace('IDR', '')
        prices.set(symbol, parseFloat(item.price))
      }
    }
  } catch (e) {
    console.error('Failed to fetch from Binance:', e)
  }
  
  // If Binance doesn't have IDR pairs, try a different approach
  // For Indonesian stocks, we might need to use a different provider
  // This is a placeholder - replace with actual IDX data source
  
  return prices
}

async function fetchFromYahooFinance(symbols: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>()
  
  // Use Yahoo Finance query API (unofficial but widely used)
  const symbolsStr = symbols.map(s => `${s}.JK`).join(',')
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsStr}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FinTrack/1.0)',
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      const quotes = data.quoteResponse?.result || []
      
      for (const quote of quotes) {
        const symbol = quote.symbol.replace('.JK', '')
        if (quote.regularMarketPrice) {
          prices.set(symbol, quote.regularMarketPrice)
        }
      }
    }
  } catch (e) {
    console.error('Failed to fetch from Yahoo Finance:', e)
  }
  
  return prices
}

serve(async (req) => {
  const startTime = Date.now()
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  
  try {
    // Get symbols from holdings that need price updates
    const { data: holdings, error: holdingsError } = await supabase
      .from('investment_holdings')
      .select('symbol, asset_class')
      .eq('asset_class', 'equity')
    
    if (holdingsError) throw holdingsError
    
    const symbols = [...new Set(holdings?.map(h => h.symbol) || [])]
    
    if (symbols.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No equity holdings found',
        updated: 0,
        durationMs: Date.now() - startTime,
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    // Fetch prices (try Yahoo Finance first for IDX stocks)
    const prices = await fetchFromYahooFinance(symbols)
    
    // Also try a fallback for any missing symbols
    const missingSymbols = symbols.filter(s => !prices.has(s))
    if (missingSymbols.length > 0) {
      // Could add another source here
      console.log('Missing symbols:', missingSymbols)
    }
    
    // Upsert price snapshots
    const now = new Date().toISOString()
    let updated = 0
    
    for (const [symbol, price] of prices) {
      const { error } = await supabase
        .from('investment_price_snapshots')
        .upsert({
          symbol,
          asset_class: 'equity',
          price,
          currency: 'IDR',
          source: 'yahoo_finance',
          timestamp: now,
        }, { onConflict: 'symbol,asset_class,source,timestamp' })
      
      if (!error) updated++
    }
    
    // Also refresh portfolio snapshots for affected users
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
      missingSymbols: missingSymbols.length,
      durationMs: Date.now() - startTime,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('Price ingestion error:', error)
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