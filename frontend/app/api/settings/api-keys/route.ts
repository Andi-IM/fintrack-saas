import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listApiKeys, generateApiKey } from '@/lib/auth/api-keys'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const keys = await listApiKeys(user.id, supabase)
    return NextResponse.json({ success: true, data: keys })
  } catch (error: any) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch API keys' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let name = 'Browser Extension Sync'
    try {
      const body = await req.json()
      if (body?.name && typeof body.name === 'string') {
        name = body.name.slice(0, 100).trim() || name
      }
    } catch {
      // Body is optional
    }

    // Pass the user's session client so RLS policy (auth.uid() = user_id) is satisfied
    const newKey = await generateApiKey(user.id, name, undefined, supabase)

    return NextResponse.json({
      success: true,
      data: newKey,
      message: 'API Key berhasil dibuat. Salin sekarang karena kunci tidak akan ditampilkan lagi.',
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating API key:', error)
    // Return actual error message for debugging (remove in production if sensitive)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create API key' },
      { status: 500 }
    )
  }
}
