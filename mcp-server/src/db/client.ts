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

export function ensureUserFilter<T extends { user_id?: string }>(
  query: any,
  config: ServerConfig,
  customUserId?: string
) {
  const targetUserId = customUserId || config.userId;
  if (targetUserId && isValidUuid(targetUserId)) {
    return query.eq('user_id', targetUserId);
  }
  return query;
}
