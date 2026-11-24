import "server-only";
import { supabaseAdmin } from "./supabase";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  telegramId: number | null;
}

/** Пользователь по заголовку Authorization: Bearer <access_token> (сессия Supabase Auth). */
export async function getUser(req: Request): Promise<AuthUser | null> {
  const db = supabaseAdmin();
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!db || !token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const m = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const email = data.user.email && !data.user.email.endsWith("@telegram.unihelper.app") ? data.user.email : null;
  return {
    id: data.user.id,
    email,
    name: (m.full_name as string) || (m.name as string) || null,
    telegramId: (m.telegram_id as number) ?? null,
  };
}
