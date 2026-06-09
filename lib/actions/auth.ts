'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
  }

  // Use Magic Link / OTP login for passwordless flow
  const { error } = await supabase.auth.signInWithOtp({
    email: data.email,
    options: {
      shouldCreateUser: true, // Allow creating new user if they don't exist
    }
  })

  if (error) {
    redirect('/login?message=Could not authenticate user')
  }

  // With magic link, user needs to check email.
  // We redirect them to a page telling them to check their email.
  redirect('/login?message=Check your email for the login link')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/login')
}
