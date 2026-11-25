"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase в браузере — только для входа (Auth). Данные читаются через наши API.
// Библиотека (~65 КБ) грузится отдельным чанком после первой отрисовки, а не со страницей.

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const authEnabled = Boolean(URL_ && ANON);

let client: Promise<SupabaseClient | null> | null = null;

export function supabaseBrowser(): Promise<SupabaseClient | null> {
  client ??= authEnabled
    ? import("@supabase/supabase-js").then(({ createClient }) =>
        createClient(URL_!, ANON!, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }),
      )
    : Promise.resolve(null);
  return client;
}
