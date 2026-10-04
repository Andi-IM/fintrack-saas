import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revokeApiKey } from '@/lib/auth/api-keys'

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!params.id) {
      return NextResponse.json({ success: false, error: 'Key ID is required' }, { status: 400 })
    }

    await revokeApiKey(user.id, params.id, supabase)

    return NextResponse.json({
      success: true,
      message: 'API Key berhasil dicabut.',
    })
  } catch (error: any) {
    console.error('Error revoking API key:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to revoke API key' },
      { status: 500 }
    )
  }
}
