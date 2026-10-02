import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// Try loading .env.local first, then fallback/supplement with .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
dotenv.config();

export interface ServerConfig {
  supabaseUrl: string;
  supabaseKey: string;
  userId?: string;
  isServiceRole: boolean;
}

function checkJwtRole(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      return payload.role || null;
    }
  } catch {}
  return null;
}

export function loadConfig(): ServerConfig {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const userId = process.env.FINTRACK_USER_ID;

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  }

  const supabaseKey = serviceRoleKey || anonKey;
  if (!supabaseKey) {
    throw new Error('Missing Supabase key: Provide either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
  }

  const role = checkJwtRole(supabaseKey);
  const isServiceRole = role === 'service_role';

  if (serviceRoleKey && role === 'anon') {
    process.stderr.write(
      '[FinTrack MCP Warning] SUPABASE_SERVICE_ROLE_KEY is set to a public "anon" key, NOT a "service_role" secret!\n' +
      'Row-Level Security (RLS) will block storage uploads and database modifications.\n' +
      'Please obtain the secret "service_role" key from Supabase Dashboard -> Project Settings -> API.\n'
    );
  }

  return {
    supabaseUrl,
    supabaseKey,
    userId,
    isServiceRole,
  };
}
