const DEFAULT_ALLOWED_ORIGINS = ['https://app.bibit.id']

function getAllowedOrigins(): string[] {
  const configured = process.env.EXTENSION_ALLOWED_ORIGINS
  if (!configured) return DEFAULT_ALLOWED_ORIGINS
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function resolveCorsOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null
  if (getAllowedOrigins().includes(requestOrigin)) return requestOrigin
  return null
}

export function buildCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = resolveCorsOrigin(requestOrigin)
  if (!origin) return {}

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-refresh-token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export function corsPreflightResponse(request: Request): Response {
  const headers = buildCorsHeaders(request.headers.get('origin'))
  return new Response(null, { status: 204, headers })
}
