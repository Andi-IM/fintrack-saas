const FINTRACK_DOMAIN = 'fintrek.web.id'
const SUPABASE_AUTH_COOKIE_PREFIX = 'sb-'
const SUPABASE_AUTH_COOKIE_SUFFIX = '-auth-token'

export interface FinTrackSession {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
}

interface SupabaseCookiePayload {
  access_token?: string
  refresh_token?: string
  expires_at?: number
}

function isAuthCookieName(name: string): boolean {
  return name.startsWith(SUPABASE_AUTH_COOKIE_PREFIX) && name.includes(SUPABASE_AUTH_COOKIE_SUFFIX)
}

function baseName(name: string): string {
  return name.split('.')[0]
}

function decodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/**
 * Supabase SSR stores the session as a single JSON cookie, or split across
 * chunked cookies named `<base>.0`, `<base>.1`, ... Reassemble the chunks in
 * order before parsing.
 */
function reassembleSessionValue(chunks: Map<string, string>, name: string): string | null {
  const base = baseName(name)
  const sorted = [...chunks.entries()]
    .filter(([key]) => baseName(key) === base)
    .sort((a, b) => {
      const aIdx = Number(a[0].split('.')[1] ?? 0)
      const bIdx = Number(b[0].split('.')[1] ?? 0)
      return aIdx - bIdx
    })
    .map(([, value]) => value)

  if (sorted.length === 0) return null
  return sorted.join('')
}

function parseSession(rawValue: string): FinTrackSession | null {
  const decoded = decodeCookieValue(rawValue)
  let parsed: unknown
  try {
    parsed = JSON.parse(decoded)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') return null
  const payload = parsed as SupabaseCookiePayload
  if (typeof payload.access_token !== 'string' || payload.access_token.length === 0) return null

  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : null,
    expiresAt: typeof payload.expires_at === 'number' ? payload.expires_at : null,
  }
}

export async function getFinTrackSession(): Promise<FinTrackSession | null> {
  if (!chrome?.cookies?.getAll) return null

  const cookies = await chrome.cookies.getAll({ domain: FINTRACK_DOMAIN })
  const authCookies = cookies.filter((cookie) => isAuthCookieName(cookie.name))
  if (authCookies.length === 0) return null

  const chunks = new Map<string, string>()
  for (const cookie of authCookies) {
    chunks.set(cookie.name, cookie.value)
  }

  const rootNames = authCookies
    .map((cookie) => cookie.name)
    .filter((name) => !name.includes('.'))

  const candidateNames = rootNames.length > 0 ? rootNames : authCookies.map((cookie) => cookie.name)

  for (const name of candidateNames) {
    const raw = reassembleSessionValue(chunks, name)
    if (!raw) continue
    const session = parseSession(raw)
    if (session) return session
  }

  return null
}

export function isSessionExpired(session: FinTrackSession, skewSeconds = 60): boolean {
  if (session.expiresAt === null) return false
  return session.expiresAt * 1000 <= Date.now() + skewSeconds * 1000
}
