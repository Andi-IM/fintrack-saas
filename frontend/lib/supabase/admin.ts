import { createClient, SupabaseClient } from '@supabase/supabase-js'

let adminClientInstance: SupabaseClient | null = null

/**
 * Privileged Supabase client using the service role key.
 *
 * This client bypasses Row-Level Security and MUST only be used in trusted
 * server-side contexts (API routes, background jobs). Never expose it to the client.
 *
 * Throws if SUPABASE_SERVICE_ROLE_KEY is not configured so that operations that
 * require RLS bypass fail loudly instead of silently degrading to anon access.
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. This operation requires privileged access to bypass Row-Level Security. Configure it in the server environment.'
    )
  }

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

/**
 * Anon Supabase client for operations that only need to execute
 * SECURITY DEFINER RPCs (e.g. public.verify_and_use_api_key).
 * Subject to RLS for direct table access — do not use for privileged writes.
 */
export function createAnonClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
