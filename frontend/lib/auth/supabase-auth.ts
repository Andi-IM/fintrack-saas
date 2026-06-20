import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from './types'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export class SupabaseAuthService implements AuthService {
  async login(origin: string): Promise<void> {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Github auth error:', error)
      redirect(`/login?message=${encodeURIComponent(error.message)}`)
    }

    if (data.url) {
      redirect(data.url)
    }
  }

  async logout(): Promise<void> {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  async updateSession(request: NextRequest): Promise<NextResponse> {
    // Safeguard: bypass middleware for static files and api routes
    const { pathname } = request.nextUrl
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/favicon.ico') ||
      pathname.includes('.')
    ) {
      return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // refreshing the auth token
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const authorizedEmail = process.env.AUTHORIZED_EMAIL
    if (user && user.email !== authorizedEmail) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('message', 'Unauthorized user email')
      return NextResponse.redirect(url)
    }

    if (
      !user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/auth')
    ) {
      // no user, potentially respond by redirecting the user to the login page
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }
}
