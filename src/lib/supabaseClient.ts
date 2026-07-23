"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

// Temporary: log the first 30 chars of the URL so we can verify env vars in prod
console.log("[supabase] url prefix:", url.slice(0, 30));

export const supabase = createClient(url, key);
