import { createClient, SupabaseClient } from '@supabase/supabase-js'

let adminClientInstance: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  // If service role key is present, reuse or create privileged admin client
  if (serviceRoleKey) {
    if (!adminClientInstance) {
      adminClientInstance = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    }
    return adminClientInstance
  }

  // Graceful fallback to anon client (can execute SECURITY DEFINER RPCs even if service role key is not yet set in Vercel)
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
