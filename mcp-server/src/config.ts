import dotenv from 'dotenv';

dotenv.config();

export interface ServerConfig {
  supabaseUrl: string;
  supabaseKey: string;
  userId?: string;
  isServiceRole: boolean;
}

export function loadConfig(): ServerConfig {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const userId = process.env.FINTRACK_USER_ID;

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  }

  const supabaseKey = serviceRoleKey || anonKey;
  if (!supabaseKey) {
    throw new Error('Missing Supabase key: Provide either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
  }

  const isServiceRole = Boolean(serviceRoleKey);

  return {
    supabaseUrl,
    supabaseKey,
    userId,
    isServiceRole,
  };
}
