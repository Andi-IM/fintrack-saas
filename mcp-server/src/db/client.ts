import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ServerConfig } from '../config.js';

let supabaseClient: SupabaseClient | null = null;

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
  if (targetUserId) {
    return query.eq('user_id', targetUserId);
  }
  return query;
}
