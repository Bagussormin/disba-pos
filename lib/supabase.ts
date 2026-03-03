import { createClient } from "@supabase/supabase-js";

// URL harus sesuai dengan project ID di Key kamu
const supabaseUrl = "https://sgfrsxpdimisjonmzohv.supabase.co"; 

// Pastikan kunci ini utuh, tidak ada spasi di awal atau akhir
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZnJzeHBkaW1pc2pvbm16b2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTM3NDAsImV4cCI6MjA4NTE2OTc0MH0.J6YzIdfC8l3-lYq7uogHhM7AN0ez2c_HnT9ctxxkjfw"; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);