import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ServerConfig } from '../config.js';

let supabaseClient: SupabaseClient | null = null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

export function getSupabaseClient(config: ServerConfig): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

export function resolveTargetUserId(config: ServerConfig, customUserId?: string): string {
  const targetUserId = customUserId || config.userId;
  if (!targetUserId) {
    throw new Error(
      'Target user_id is required: either provide "user_id" in the tool parameters or configure FINTRACK_USER_ID in your environment.'
    );
  }
  if (!isValidUuid(targetUserId)) {
    throw new Error(
      `Invalid user UUID provided: "${targetUserId}". It must be a valid 36-character UUID (e.g. 550e8400-e29b-41d4-a716-446655440000).`
    );
  }
  return targetUserId;
}

export function ensureUserFilter(
  query: any,
  config: ServerConfig,
  customUserId?: string
) {
  const targetUserId = resolveTargetUserId(config, customUserId);
  return query.eq('user_id', targetUserId);
}
