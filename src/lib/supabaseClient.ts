"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Safe to call with empty strings at build time — actual requests will
// fail gracefully at runtime if the env vars are missing in production.
export const supabase = createClient(url, key);
