"use client";

import { createClient } from "@supabase/supabase-js";

// The browser Supabase client. Uses the public (anon/publishable) key, which is
// safe to ship to the browser — data is protected by Row Level Security and the
// shared team login. The session is persisted in the browser automatically.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
  );
}

export const supabase = createClient(url, key);
