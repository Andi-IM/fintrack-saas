import { NextResponse } from 'next/server'
import { resetDB } from '@/lib/repositories/fs-mock-db'
import { revalidatePath } from 'next/cache'

export async function POST() {
  if (process.env.NEXT_PUBLIC_IS_TESTING !== 'true') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  try {
    resetDB()
    revalidatePath('/', 'layout')
    return NextResponse.json({ success: true, message: 'Mock database reset successfully' })
  } catch (error) {
    console.error('Failed to reset DB:', error)
    return NextResponse.json({ error: 'Failed to reset database' }, { status: 500 })
  }
}
