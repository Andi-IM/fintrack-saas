import { headers } from 'next/headers'

export interface OriginResolver {
  resolve(): Promise<string>
}

export class DefaultOriginResolver implements OriginResolver {
  async resolve(): Promise<string> {
    if (process.env.APP_URL) {
      return process.env.APP_URL
    }
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
      return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    }
    const headersList = await headers()
    const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
    const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
    return `${proto}://${host}`
  }
}

export async function resolveAuthOrigin(): Promise<string> {
  return new DefaultOriginResolver().resolve()
}
