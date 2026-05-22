import { createClient } from "@supabase/supabase-js";

// URL harus sesuai dengan project ID di Key kamu (sekarang diambil dari .env.local)
// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ""; 

// Pastikan kunci ini utuh (sekarang diambil dari .env.local)
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ""; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);