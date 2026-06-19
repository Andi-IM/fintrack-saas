'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function login() {
  const supabase = await createClient()
  let origin: string | undefined

  if (process.env.APP_URL) {
    origin = process.env.APP_URL
  } else if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    origin = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  } else {
    const headersList = await headers()
    const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
    const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
    origin = `${proto}://${host}`
  }

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

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/login')
}
