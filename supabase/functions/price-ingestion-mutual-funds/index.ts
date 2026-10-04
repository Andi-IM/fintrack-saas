import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Popular Indonesian mutual funds (Reksa Dana) - symbols from Bareksa/Bibit/Infovesta
const MUTUAL_FUND_SOURCES = {
  bibit: 'https://api.bibit.id/v1/funds/nav',
  bareksa: 'https://api.bareksa.com/v2/funds/nav',
  infovesta: 'https://api.infovesta.com/v1/nav',
}

async function fetchBibitNAV(): Promise<Map<string, number>> {
  const prices = new Map<string, number>()
  
  try {
    // Bibit API - this is a mock structure, actual API may differ
    const response = await fetch('https://api.bibit.id/v1/funds', {
      headers: { 'User-Agent': 'FinTrack/1.0' },
    })
    
    if (response.ok) {
      const data = await response.json()
      // Assuming data structure: { funds: [{ code, nav, currency }] }
      for (const fund of data.funds || []) {
        if (fund.nav && fund.code) {
          prices.set(fund.code, fund.nav)
        }
      }
    }
  } catch (e) {
    console.error('Bibit API error:', e)
  }
  
  return prices
}

async function fetchBareksaNAV(): Promise<Map<string, number>> {
  const prices = new Map<string, number>()
  
  try {
    const response = await fetch('https://api.bareksa.com/v2/funds', {
      headers: { 'User-Agent': 'FinTrack/1.0' },
    })
    
    if (response.ok) {
      const data = await response.json()
      for (const fund of data.data || []) {
        if (fund.nav && fund.code) {
          prices.set(fund.code, fund.nav)
        }
      }
    }
  } catch (e) {
    console.error('Bareksa API error:', e)
  }
  
  return prices
}

async function fetchInfovestaNAV(): Promise<Map<string, number>> {
  const prices = new Map<string, number>()
  
  try {
    const response = await fetch('https://api.infovesta.com/v1/funds', {
      headers: { 'User-Agent': 'FinTrack/1.0' },
    })
    
    if (response.ok) {
      const data = await response.json()
      for (const fund of data.funds || []) {
        if (fund.nav && fund.code) {
          prices.set(fund.code, fund.nav)
        }
      }
    }
  } catch (e) {
    console.error('Infovesta API error:', e)
  }
  
  return prices
}

serve(async (req) => {
  const startTime = Date.now()
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  
  try {
    // Get mutual fund holdings
    const { data: holdings, error: holdingsError } = await supabase
      .from('investment_holdings')
      .select('symbol, asset_class')
      .eq('asset_class', 'fixed_income')
    
    if (holdingsError) throw holdingsError
    
    const symbols = [...new Set(holdings?.map(h => h.symbol) || [])]
    
    if (symbols.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No mutual fund holdings found',
        updated: 0,
        durationMs: Date.now() - startTime,
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    // Fetch NAV from multiple sources and merge
    const allPrices = new Map<string, { price: number; source: string }>()
    
    const sources = [
      { name: 'bibit', fetcher: fetchBibitNAV },
      { name: 'bareksa', fetcher: fetchBareksaNAV },
      { name: 'infovesta', fetcher: fetchInfovestaNAV },
    ]
    
    for (const source of sources) {
      const prices = await source.fetcher()
      for (const [symbol, price] of prices) {
        if (symbols.includes(symbol) && !allPrices.has(symbol)) {
          allPrices.set(symbol, { price, source: source.name })
        }
      }
    }
    
    // Upsert price snapshots
    const now = new Date().toISOString()
    let updated = 0
    
    for (const [symbol, { price, source }] of allPrices) {
      const { error } = await supabase
        .from('investment_price_snapshots')
        .upsert({
          symbol,
          asset_class: 'fixed_income',
          price,
          currency: 'IDR',
          source,
          timestamp: now,
        }, { onConflict: 'symbol,asset_class,source,timestamp' })
      
      if (!error) updated++
    }
    
    // Refresh portfolio snapshots
    const { data: users } = await supabase
      .from('investment_holdings')
      .select('user_id')
      .in('symbol', Array.from(allPrices.keys()))
    
    const uniqueUsers = [...new Set(users?.map(u => u.user_id) || [])]
    
    for (const userId of uniqueUsers) {
      await supabase.rpc('refresh_portfolio_snapshot', { p_user_id: userId })
    }
    
    return new Response(JSON.stringify({
      success: true,
      updated,
      totalSymbols: symbols.length,
      foundSymbols: allPrices.size,
      durationMs: Date.now() - startTime,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('Mutual fund price ingestion error:', error)
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