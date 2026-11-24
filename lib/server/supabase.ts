import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Серверный клиент с service role. Используется только в app/api/*.
// Если ключи не заданы, приложение работает в демо-режиме: данные не сохраняются в базу.
let client: SupabaseClient | null | undefined;

export function supabaseAdmin(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}
