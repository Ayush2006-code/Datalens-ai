import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gmhdvgwsngsqphchlvlf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseAnonKey) {
  console.error('Supabase key missing in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);