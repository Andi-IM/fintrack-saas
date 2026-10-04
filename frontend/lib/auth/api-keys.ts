import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const API_KEY_PREFIX = 'ft_sync_'
export const DEFAULT_KEY_SCOPE = 'investments:sync'

export interface ApiKeyRecord {
  id: string
  userId: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt: string | null
  isActive: boolean
  createdAt: string
}

export interface GeneratedApiKey extends ApiKeyRecord {
  rawKey: string // Plaintext, ONLY exposed once during generation
}

export interface VerifyApiKeyResult {
  valid: boolean
  userId?: string
  keyId?: string
  name?: string
  error?: string
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Generate a cryptographically secure API key for a user.
 * The plaintext key is returned ONLY once and never stored in the database.
 */
export async function generateApiKey(
  userId: string,
  name: string = 'Browser Extension Sync',
  scopes: string[] = [DEFAULT_KEY_SCOPE]
): Promise<GeneratedApiKey> {
  const entropy = crypto.randomBytes(32).toString('hex')
  const rawKey = `${API_KEY_PREFIX}${entropy}`
  const keyHash = hashApiKey(rawKey)
  const keyPrefix = `${rawKey.slice(0, 16)}...`

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes,
      is_active: true,
    })
    .select('id, user_id, name, key_prefix, scopes, last_used_at, is_active, created_at')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to save generated API key')
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    keyPrefix: data.key_prefix,
    scopes: data.scopes,
    lastUsedAt: data.last_used_at,
    isActive: data.is_active,
    createdAt: data.created_at,
    rawKey,
  }
}

/**
 * Verify an incoming API key against stored SHA-256 hashes and validate its scope.
 * Updates last_used_at atomically when valid.
 */
export async function verifyApiKey(
  providedKey: string,
  requiredScope: string = DEFAULT_KEY_SCOPE
): Promise<VerifyApiKeyResult> {
  const trimmed = providedKey.trim()
  if (!trimmed.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: 'Invalid API key format' }
  }

  const keyHash = hashApiKey(trimmed)
  const supabase = createAdminClient()

  // Call atomic security-definer function
  const { data, error } = await supabase.rpc('verify_and_use_api_key', {
    p_key_hash: keyHash,
    p_required_scope: requiredScope,
  })

  if (error) {
    console.error('[FinTrack Auth] Error executing verify_and_use_api_key RPC:', error)
    return { valid: false, error: 'Database verification failed' }
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result || !result.valid) {
    return { valid: false, error: 'Invalid, inactive, or unauthorized API key' }
  }

  return {
    valid: true,
    userId: result.user_id,
    keyId: result.key_id,
    name: result.name,
  }
}

/**
 * List all active API keys for a user (without exposing secret hashes or plaintext keys).
 */
export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, name, key_prefix, scopes, last_used_at, is_active, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to list API keys')
  }

  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: row.scopes,
    lastUsedAt: row.last_used_at,
    isActive: row.is_active,
    createdAt: row.created_at,
  }))
}

/**
 * Revoke an API key immediately.
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message || 'Failed to revoke API key')
  }

  return true
}
