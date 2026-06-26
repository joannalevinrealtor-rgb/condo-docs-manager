"use client";

import { createClient } from "@supabase/supabase-js";

// Fall back to placeholder values at build time so createClient doesn't throw.
// The real values come from Vercel env vars at runtime.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(url, key);
