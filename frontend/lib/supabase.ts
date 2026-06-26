import { createClient } from '@supabase/supabase-js';

// Define the database type for better typing later if schema is available
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function checkIsLocalSupabase(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return (
    process.env.NODE_ENV === 'development' ||
    supabaseUrl.includes('localhost') ||
    supabaseUrl.includes('127.0.0.1') ||
    !supabaseUrl.includes('.supabase.co')
  );
}
