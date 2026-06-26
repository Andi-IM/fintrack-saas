import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from './types'

export class FakeAuthService implements AuthService {
  async login(origin: string): Promise<void> {
    // In E2E tests, login simply creates a mock session cookie and redirects to the callback/dashboard
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.set('fintrack_fake_session', 'valid_test_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    })
    
    // We can simulate redirecting to callback or just directly to dashboard
    const { redirect } = await import('next/navigation')
    redirect('/')
  }

  async loginWithPassword(email: string, password: string): Promise<{ error: any }> {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.set('fintrack_fake_session', 'valid_test_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    })
    return { error: null }
  }

  async signUpWithPassword(email: string, password: string): Promise<{ error: any }> {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.set('fintrack_fake_session', 'valid_test_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    })
    return { error: null }
  }

  async logout(): Promise<void> {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.delete('fintrack_fake_session')
    
    const { redirect } = await import('next/navigation')
    redirect('/login')
  }

  async updateSession(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl
    
    // Safeguard for static and API routes
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/favicon.ico') ||
      pathname.includes('.')
    ) {
      return NextResponse.next({ request })
    }

    const fakeSession = request.cookies.get('fintrack_fake_session')
    const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/auth')

    if (!fakeSession && !isPublicRoute) {
      // Unauthenticated access to protected route
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    return NextResponse.next({ request })
  }

  async getUser() {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const isLoggedIn = cookieStore.has('fintrack_fake_session')

    if (isLoggedIn) {
      const mockUser = {
        id: 'mock-user-id',
        email: process.env.AUTHORIZED_EMAIL || 'ci@example.com',
        role: 'authenticated',
        aud: 'authenticated',
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
      }
      return { data: { user: mockUser as any }, error: null }
    }

    return { data: { user: null }, error: { message: 'Auth session missing!' } }
  }
}
