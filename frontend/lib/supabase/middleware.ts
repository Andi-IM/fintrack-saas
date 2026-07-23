import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Clone headers to allow modification
  const requestHeaders = new Headers(request.headers)
  // Delete the headers to prevent client-side spoofing
  requestHeaders.delete('x-user-email')
  requestHeaders.delete('x-user-id')

  // Safeguard: bypass middleware for static files and api routes
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const authorizedEmail = process.env.AUTHORIZED_EMAIL
  const redirectToLogin = (message?: string) => {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    if (message) {
      url.searchParams.set('message', message)
    }
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  const attachUserHeaders = (id: string, email: string) => {
    requestHeaders.set('x-user-email', email)
    requestHeaders.set('x-user-id', id)

    const finalResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie.name, cookie.value, cookie)
    })

    return finalResponse
  }

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims()

  const claims = claimsData?.claims
  const claimedUserId = typeof claims?.sub === 'string' ? claims.sub : null
  const claimedEmail = typeof claims?.email === 'string' ? claims.email : null

  if (claimedUserId && claimedEmail && !claimsError) {
    if (claimedEmail !== authorizedEmail) {
      await supabase.auth.signOut()
      return redirectToLogin('Unauthorized user email')
    }

    return attachUserHeaders(claimedUserId, claimedEmail)
  }

  // Fallback keeps SSR session refresh and stale-token handling secure when
  // claims cannot be validated locally, at the cost of one Auth network call.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && user.email !== authorizedEmail) {
    await supabase.auth.signOut()
    return redirectToLogin('Unauthorized user email')
  }

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    return redirectToLogin()
  }

  // If user is successfully authenticated and authorized, set the email and id in request headers
  if (user && user.email) {
    supabaseResponse = attachUserHeaders(user.id, user.email)
  }

  return supabaseResponse
}
