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

  // If user is successfully authenticated and authorized, set the email and id in request headers
  if (user && user.email) {
    requestHeaders.set('x-user-email', user.email)
    requestHeaders.set('x-user-id', user.id)
    
    // We must recreate the response to enforce the updated request headers, 
    // while preserving any cookies set by Supabase
    const finalResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    
    // Copy cookies from the intermediate supabaseResponse
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    
    supabaseResponse = finalResponse
  }

  return supabaseResponse
}
