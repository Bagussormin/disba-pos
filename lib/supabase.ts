import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "FATAL: Missing Supabase credentials in environment variables. \n" +
    "Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local"
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch {
  throw new Error("FATAL: VITE_SUPABASE_URL is not a valid URL");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Jangan simpan session di localStorage secara default
    // (kita kelola sendiri via tenant_id)
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      "X-Client-Info": "disba-pos/1.0",
    },
  },
});