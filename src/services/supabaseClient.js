import { createClient } from '@supabase/supabase-js';

// Deep fallback checking to avoid undefined key crash
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gmhdvgwsngsqphchlvlf.supabase.co';
const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtaGR2Z3dzbmdzcXBoY2hsdmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNTM4NjMsImV4cCI6MjA1NTczOTg2M30.cXBoY2hsdmxm'; // exact fallback key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);