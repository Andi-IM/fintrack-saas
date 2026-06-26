import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

export interface AuthService {
  login(origin: string): Promise<void>
  loginWithPassword(email: string, password: string): Promise<{ error: any }>
  signUpWithPassword(email: string, password: string): Promise<{ error: any }>
  logout(): Promise<void>
  updateSession(request: NextRequest): Promise<NextResponse>
  getUser(): Promise<{ data: { user: User | null }; error: any }>
}
