import { createClient } from '@supabase/supabase-js';

// Define the database type for better typing later if schema is available
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
