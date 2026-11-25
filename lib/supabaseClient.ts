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

let emailClient: Promise<SupabaseClient | null> | null = null;

/**
 * Клиент только для отправки письма со ссылкой: неявный поток (implicit). Ссылка из письма тогда
 * несёт токены сама и срабатывает в любом браузере — на телефоне письмо часто открывается
 * не там, где начали вход. Сессию из ссылки сохраняет основной клиент на /auth/callback.
 */
export function supabaseEmailLink(): Promise<SupabaseClient | null> {
  emailClient ??= authEnabled
    ? import("@supabase/supabase-js").then(({ createClient }) =>
        createClient(URL_!, ANON!, { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "uh-email-link" } }),
      )
    : Promise.resolve(null);
  return emailClient;
}
