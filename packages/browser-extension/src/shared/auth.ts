const FINTRACK_DOMAIN = 'fintrek.web.id'
const SUPABASE_AUTH_COOKIE_PREFIX = 'sb-'
const SUPABASE_AUTH_COOKIE_SUFFIX = '-auth-token'
const BASE64_PREFIX = 'base64-'

export interface FinTrackSession {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  domain?: string
}

interface SupabaseCookiePayload {
  access_token?: string
  refresh_token?: string
  expires_at?: number
}

export interface FinTrackSessionResult {
  session: FinTrackSession | null
  discoveredCookies: string[]
  checkedTargets: string[]
}

export function isAuthCookieName(name: string): boolean {
  const lower = name.toLowerCase()
  if (lower.startsWith('sb-') && (lower.includes('auth-token') || lower.includes('token') || lower.includes('auth'))) {
    return true
  }
  if (lower.includes('supabase') && (lower.includes('token') || lower.includes('auth'))) {
    return true
  }
  return false
}

export function baseName(name: string): string {
  return name.split('.')[0]
}

/**
 * Converts a Base64-URL string to UTF-8 decoded text.
 * Used by Supabase SSR which stores chunked cookies with a `base64-` prefix.
 */
export function decodeBase64URL(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4 !== 0) {
    base64 += '='
  }

  if (typeof atob === 'function') {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  }

  const globalBuf = (globalThis as unknown as { Buffer?: { from(data: string, encoding: string): { toString(enc: string): string } } }).Buffer
  if (globalBuf) {
    return globalBuf.from(base64, 'base64').toString('utf-8')
  }

  return base64
}

export function decodeCookieValue(raw: string): string {
  let val = raw
  try {
    val = decodeURIComponent(raw)
  } catch {
    val = raw
  }

  if (val.startsWith(BASE64_PREFIX)) {
    try {
      return decodeBase64URL(val.slice(BASE64_PREFIX.length))
    } catch {
      return val
    }
  }

  return val
}

/**
 * Supabase SSR stores the session as a single JSON cookie, or split across
 * chunked cookies named `<base>.0`, `<base>.1`, ... Reassemble the chunks in
 * order before parsing.
 */
export function reassembleSessionValue(chunks: Map<string, string>, name: string): string | null {
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

export function parseSession(rawValue: string): FinTrackSession | null {
  const decoded = decodeCookieValue(rawValue)
  let parsed: unknown
  try {
    parsed = JSON.parse(decoded)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') return null

  // Support array format [access_token, refresh_token, expires_at, ...]
  if (Array.isArray(parsed)) {
    const accessToken = typeof parsed[0] === 'string' ? parsed[0] : null
    const refreshToken = typeof parsed[1] === 'string' ? parsed[1] : null
    const expiresAt = typeof parsed[2] === 'number' ? parsed[2] : null
    if (!accessToken) return null
    return {
      accessToken,
      refreshToken,
      expiresAt,
    }
  }

  // Support object format { access_token, refresh_token, expires_at }
  const payload = parsed as SupabaseCookiePayload
  if (typeof payload.access_token !== 'string' || payload.access_token.length === 0) return null

  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : null,
    expiresAt: typeof payload.expires_at === 'number' ? payload.expires_at : null,
  }
}

export async function getFinTrackSession(): Promise<FinTrackSession | null> {
  const result = await getFinTrackSessionWithDiagnostics()
  return result.session
}

export async function getFinTrackSessionWithDiagnostics(): Promise<FinTrackSessionResult> {
  if (!chrome?.cookies?.getAll) {
    console.warn('[FinTrack Auth] chrome.cookies.getAll API not available in this context')
    return { session: null, discoveredCookies: [], checkedTargets: [] }
  }

  const targets = [
    { url: `https://${FINTRACK_DOMAIN}/`, domain: FINTRACK_DOMAIN, label: FINTRACK_DOMAIN },
    { url: `https://www.${FINTRACK_DOMAIN}/`, domain: `www.${FINTRACK_DOMAIN}`, label: `www.${FINTRACK_DOMAIN}` },
    { url: `https://${FINTRACK_DOMAIN}/`, domain: `.${FINTRACK_DOMAIN}`, label: `.${FINTRACK_DOMAIN}` },
  ]

  const checkedTargets: string[] = []
  const allDiscoveredCookies: string[] = []

  for (const target of targets) {
    checkedTargets.push(target.label)
    try {
      // Host-only cookies set without a domain attribute (default in Next.js SSR)
      // must be queried via { url }. Domain-level cookies must be queried via { domain }.
      const [byUrl, byDomain] = await Promise.all([
        chrome.cookies.getAll({ url: target.url }).catch(() => []),
        chrome.cookies.getAll({ domain: target.domain }).catch(() => []),
      ])

      const cookieMap = new Map<string, chrome.cookies.Cookie>()
      for (const c of [...byUrl, ...byDomain]) {
        cookieMap.set(c.name, c)
      }

      const cookies = Array.from(cookieMap.values())
      const cookieNames = cookies.map((c) => c.name)
      if (cookieNames.length > 0) {
        allDiscoveredCookies.push(`${target.label}: [${cookieNames.join(', ')}]`)
      }

      console.log(`[FinTrack Auth] Total cookies found on ${target.label} (url + domain):`, cookieNames)

      const authCookies = cookies.filter((cookie) => isAuthCookieName(cookie.name))
      if (authCookies.length === 0) {
        console.warn(`[FinTrack Auth] No matching auth cookies on ${target.label}. Found:`, cookieNames)
        continue
      }

      console.log(`[FinTrack Auth] Found ${authCookies.length} candidate auth cookie(s) on ${target.label}:`, authCookies.map((c) => c.name))

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
        if (session) {
          console.log(`[FinTrack Auth] Successfully loaded FinTrack session from cookie "${name}" on ${target.label}`)
          return {
            session: {
              ...session,
              domain: target.label,
            },
            discoveredCookies: allDiscoveredCookies,
            checkedTargets,
          }
        }
      }
    } catch (err) {
      console.warn(`[FinTrack Auth] Error checking cookies for target ${target.label}:`, err)
    }
  }

  return {
    session: null,
    discoveredCookies: allDiscoveredCookies,
    checkedTargets,
  }
}

export function isSessionExpired(session: FinTrackSession, skewSeconds = 60): boolean {
  if (session.expiresAt === null) return false
  return session.expiresAt * 1000 <= Date.now() + skewSeconds * 1000
}
