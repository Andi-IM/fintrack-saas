'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OriginResolver, DefaultOriginResolver } from './auth-helpers'

export async function login(originResolver?: OriginResolver | FormData): Promise<void> {
  const supabase = await createClient()
  const resolver = (originResolver && 'resolve' in originResolver) ? originResolver : new DefaultOriginResolver()
  const origin = await resolver.resolve()

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

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

