import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from './types'
import { createClient } from '@/lib/supabase/server'
import { updateSession as supabaseUpdateSession } from '@/lib/supabase/middleware'
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
    return await supabaseUpdateSession(request)
  }

  async getUser() {
    const supabase = await createClient()
    return await supabase.auth.getUser()
  }
}
