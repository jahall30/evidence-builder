import { createClient } from '@supabase/supabase-js';

// This creates a single Supabase connection your whole app can use.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
