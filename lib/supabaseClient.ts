"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase в браузере — только для входа (Auth). Данные читаются через наши API.
let client: SupabaseClient | null | undefined;

export function supabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && anon ? createClient(url, anon, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null;
  return client;
}
