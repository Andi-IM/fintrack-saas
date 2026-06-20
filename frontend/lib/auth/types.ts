import { NextRequest, NextResponse } from 'next/server'

export interface AuthService {
  login(origin: string): Promise<void>
  logout(): Promise<void>
  updateSession(request: NextRequest): Promise<NextResponse>
}
