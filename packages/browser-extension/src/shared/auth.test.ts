import { describe, it, expect } from 'vitest'
import {
  parseSession,
  decodeCookieValue,
  decodeBase64URL,
  reassembleSessionValue,
  isSessionExpired,
} from './auth'

describe('auth helper functions', () => {
  const sampleSession = {
    access_token: 'header.payload.signature',
    refresh_token: 'refresh_secret_123',
    expires_at: 1900000000,
  }

  function toBase64Url(str: string): string {
    const bytes = new TextEncoder().encode(str)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  describe('decodeBase64URL', () => {
    it('decodes base64url string to text correctly', () => {
      const jsonStr = JSON.stringify(sampleSession)
      const base64url = toBase64Url(jsonStr)

      const decoded = decodeBase64URL(base64url)
      expect(decoded).toBe(jsonStr)
    })
  })

  describe('decodeCookieValue', () => {
    it('decodes regular URL encoded JSON', () => {
      const jsonStr = JSON.stringify(sampleSession)
      const encoded = encodeURIComponent(jsonStr)
      expect(decodeCookieValue(encoded)).toBe(jsonStr)
    })

    it('decodes Supabase SSR base64- prefixed cookie', () => {
      const jsonStr = JSON.stringify(sampleSession)
      const base64url = toBase64Url(jsonStr)
      const cookieValue = `base64-${base64url}`

      expect(decodeCookieValue(cookieValue)).toBe(jsonStr)
    })
  })

  describe('parseSession', () => {
    it('parses standard JSON session payload', () => {
      const jsonStr = JSON.stringify(sampleSession)
      const session = parseSession(jsonStr)
      expect(session).toEqual({
        accessToken: sampleSession.access_token,
        refreshToken: sampleSession.refresh_token,
        expiresAt: sampleSession.expires_at,
      })
    })

    it('parses Supabase SSR base64- prefixed cookie value', () => {
      const jsonStr = JSON.stringify(sampleSession)
      const base64url = toBase64Url(jsonStr)
      const cookieValue = `base64-${base64url}`

      const session = parseSession(cookieValue)
      expect(session).toEqual({
        accessToken: sampleSession.access_token,
        refreshToken: sampleSession.refresh_token,
        expiresAt: sampleSession.expires_at,
      })
    })

    it('parses array format session payload if present', () => {
      const arraySession = ['token_abc', 'refresh_xyz', 1900000000]
      const jsonStr = JSON.stringify(arraySession)
      const session = parseSession(jsonStr)
      expect(session).toEqual({
        accessToken: 'token_abc',
        refreshToken: 'refresh_xyz',
        expiresAt: 1900000000,
      })
    })

    it('returns null for invalid JSON or missing access_token', () => {
      expect(parseSession('not-json')).toBeNull()
      expect(parseSession(JSON.stringify({ some_other_key: 'value' }))).toBeNull()
    })
  })

  describe('reassembleSessionValue', () => {
    it('reassembles chunked cookies in correct order', () => {
      const chunks = new Map<string, string>([
        ['sb-project-auth-token.1', 'chunk2'],
        ['sb-project-auth-token.0', 'chunk1'],
        ['sb-project-auth-token.2', 'chunk3'],
      ])
      const result = reassembleSessionValue(chunks, 'sb-project-auth-token')
      expect(result).toBe('chunk1chunk2chunk3')
    })
  })

  describe('isSessionExpired', () => {
    it('returns false when expiresAt is null', () => {
      expect(isSessionExpired({ accessToken: 'a', refreshToken: null, expiresAt: null })).toBe(false)
    })

    it('returns false for future expiration', () => {
      const future = Math.floor(Date.now() / 1000) + 3600
      expect(isSessionExpired({ accessToken: 'a', refreshToken: null, expiresAt: future })).toBe(false)
    })

    it('returns true for past expiration or within skew window', () => {
      const past = Math.floor(Date.now() / 1000) - 10
      expect(isSessionExpired({ accessToken: 'a', refreshToken: null, expiresAt: past })).toBe(true)

      const soon = Math.floor(Date.now() / 1000) + 30 // within default 60s skew
      expect(isSessionExpired({ accessToken: 'a', refreshToken: null, expiresAt: soon })).toBe(true)
    })
  })
})
