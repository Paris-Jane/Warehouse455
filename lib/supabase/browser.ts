"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser client using the publishable (anon) key. Respects RLS.
 * Only use when you intentionally call Supabase from the client.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or publishable/anon key in env."
    );
  }
  return createClient(url, key);
}
