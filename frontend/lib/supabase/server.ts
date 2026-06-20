import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const client = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  if (process.env.BYPASS_AUTH === 'true' && (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_IS_TESTING === 'true')) {
    client.auth.getUser = async (token?: string) => {
      return {
        data: {
          user: {
            id: 'mock-user-id',
            email: process.env.AUTHORIZED_EMAIL,
            role: 'authenticated',
            aud: 'authenticated',
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          } as any
        },
        error: null
      }
    }
  }

  return client
}
