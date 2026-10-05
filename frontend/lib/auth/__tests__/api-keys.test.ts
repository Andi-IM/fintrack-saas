import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hashApiKey, generateApiKey, verifyApiKey, listApiKeys, revokeApiKey, API_KEY_PREFIX } from '../api-keys'

// Mock createAdminClient
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'

describe('API Keys Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hashApiKey generates consistent sha256 hash', () => {
    const raw = 'ft_sync_test123'
    const hash1 = hashApiKey(raw)
    const hash2 = hashApiKey(raw)
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64)
  })

  it('generateApiKey generates key with correct prefix and stores hash', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'key-123',
            user_id: 'user-456',
            name: 'Bibit Extension',
            key_prefix: 'ft_sync_12345678...',
            scopes: ['investments:sync'],
            last_used_at: null,
            is_active: true,
            created_at: '2026-10-04T00:00:00Z',
          },
          error: null,
        }),
      }),
    })

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

    const result = await generateApiKey('user-456', 'Bibit Extension')

    expect(result.rawKey).toMatch(new RegExp(`^${API_KEY_PREFIX}`))
    expect(result.id).toBe('key-123')
    expect(result.userId).toBe('user-456')
    expect(mockSupabase.from).toHaveBeenCalledWith('api_keys')
  })

  it('verifyApiKey returns invalid if prefix does not match', async () => {
    const result = await verifyApiKey('invalid_key_prefix')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid API key format')
  })

  it('verifyApiKey successfully validates via RPC', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: [{ valid: true, user_id: 'user-789', key_id: 'key-123', name: 'Bibit Extension' }],
      error: null,
    })

    const mockSupabase = { rpc: mockRpc }
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

    const rawKey = `${API_KEY_PREFIX}1234567890abcdef1234567890abcdef`
    const result = await verifyApiKey(rawKey, 'investments:sync')

    expect(result.valid).toBe(true)
    expect(result.userId).toBe('user-789')
    expect(mockRpc).toHaveBeenCalledWith('verify_and_use_api_key', {
      p_key_hash: hashApiKey(rawKey),
      p_required_scope: 'investments:sync',
    })
  })

  it('verifyApiKey handles inactive or invalid key response', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: [{ valid: false, user_id: null, key_id: null, name: null }],
      error: null,
    })

    const mockSupabase = { rpc: mockRpc }
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

    const rawKey = `${API_KEY_PREFIX}1234567890abcdef1234567890abcdef`
    const result = await verifyApiKey(rawKey, 'investments:sync')

    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid, inactive, or unauthorized')
  })

  it('listApiKeys queries only active keys for user', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'key-1',
                user_id: 'user-1',
                name: 'Key 1',
                key_prefix: 'ft_sync_abc...',
                scopes: ['investments:sync'],
                last_used_at: null,
                is_active: true,
                created_at: '2026-10-04T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
    })

    const mockSupabase = {
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    }
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

    const keys = await listApiKeys('user-1')
    expect(keys).toHaveLength(1)
    expect(keys[0].name).toBe('Key 1')
  })

  it('revokeApiKey sets is_active to false', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    }
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

    const success = await revokeApiKey('user-1', 'key-1')
    expect(success).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('api_keys')
  })
})
