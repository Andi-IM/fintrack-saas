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
  keyRole: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id.trim());
}

function checkJwtRole(token: string): { role: string | null; exp?: number } {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      return { role: payload.role || null, exp: payload.exp };
    }
  } catch {}
  return { role: null };
}

export function loadConfig(): ServerConfig {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const rawUserId = (process.env.FINTRACK_USER_ID || '').trim();

  if (!supabaseUrl) {
    throw new Error('FATAL CONFIG ERROR: Missing SUPABASE_URL environment variable');
  }

  try {
    const parsed = new URL(supabaseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Invalid SUPABASE_URL protocol "${parsed.protocol}". Must be http: or https:`);
    }
  } catch (err: any) {
    throw new Error(`FATAL CONFIG ERROR: SUPABASE_URL is malformed: ${err?.message || err}`);
  }

  const supabaseKey = serviceRoleKey || anonKey;
  if (!supabaseKey) {
    throw new Error('FATAL CONFIG ERROR: Missing Supabase key. Provide SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_ANON_KEY.');
  }

  const { role, exp } = checkJwtRole(supabaseKey);
  const isServiceRole = role === 'service_role';

  // Fail-fast: If serviceRoleKey was explicitly set but contains an anon key
  if (serviceRoleKey && role === 'anon') {
    throw new Error(
      'FATAL CONFIG ERROR: SUPABASE_SERVICE_ROLE_KEY is set to a public "anon" key, NOT a "service_role" secret!\n' +
      'In MCP server mode, an anon key causes database queries to return empty results silently due to Row-Level Security (RLS).\n' +
      'Please obtain your actual "service_role" secret key from Supabase Dashboard -> Project Settings -> API.'
    );
  }

  if (exp && exp * 1000 < Date.now()) {
    process.stderr.write(`[FinTrack MCP Warning] The provided Supabase API key expired at ${new Date(exp * 1000).toISOString()}.\n`);
  }

  let userId: string | undefined = undefined;
  if (rawUserId) {
    if (!isValidUuid(rawUserId)) {
      throw new Error(
        `FATAL CONFIG ERROR: FINTRACK_USER_ID is not a valid UUID (received: "${rawUserId}"). ` +
        `Please specify a valid 36-character UUID from your Supabase auth.users table.`
      );
    }
    userId = rawUserId;
  } else {
    process.stderr.write(
      '[FinTrack MCP Notice] FINTRACK_USER_ID is not configured in environment. ' +
      'Tools will require an explicit "user_id" parameter for user-scoped data.\n'
    );
  }

  return {
    supabaseUrl,
    supabaseKey,
    userId,
    isServiceRole,
    keyRole: role,
  };
}
