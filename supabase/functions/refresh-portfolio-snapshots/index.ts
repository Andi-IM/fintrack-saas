import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const startTime = Date.now()
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  
  try {
    // Get all unique users who have holdings
    const { data: users, error } = await supabase
      .from('investment_holdings')
      .select('user_id')
    
    if (error) throw error
    
    const uniqueUsers = [...new Set(users?.map(u => u.user_id) || [])]
    let refreshed = 0
    let failed = 0
    
    for (const userId of uniqueUsers) {
      const { error: rpcError } = await supabase.rpc('refresh_portfolio_snapshot', {
        p_user_id: userId,
      })
      
      if (rpcError) {
        console.error(`Failed to refresh portfolio for user ${userId}:`, rpcError)
        failed++
      } else {
        refreshed++
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      refreshed,
      failed,
      totalUsers: uniqueUsers.length,
      durationMs: Date.now() - startTime,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('Refresh portfolio snapshots error:', error)
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