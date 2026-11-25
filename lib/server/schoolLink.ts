import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "./supabase";

// Сессии eMaktab/EMIS для автообновления дневника (только с согласия ученика). Храним не пароль, а то, что система
// сама выдала после входа: cookie eMaktab или токен EMIS. Шифруем AES-256-GCM ключом сервера; в базе — только шифротекст.

export type SchoolSource = "emis" | "emaktab";
export type SchoolSession = { kind: "emis"; token: string } | { kind: "emaktab"; jar: Record<string, string> };

const key = () =>
  createHash("sha256").update(`school-link:${process.env.SCHOOL_LINK_SECRET || process.env.MOCK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev"}`).digest();

export function sealSession(s: SchoolSession): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(s)), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]).toString("base64url");
}

export function openSession(v: string): SchoolSession | null {
  try {
    const b = Buffer.from(v, "base64url");
    const d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString()) as SchoolSession;
  } catch {
    return null;
  }
}

/** Срок сессии eMaktab — из cookie (≈ 14 дней); у EMIS срок не известен заранее. */
const DEFAULT_TTL: Record<SchoolSource, number> = { emaktab: 14 * 86400_000, emis: 30 * 86400_000 };

export async function saveLink(userId: string, source: SchoolSource, s: SchoolSession): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) return false;
  const now = new Date();
  const { error } = await db.from("school_links").upsert({
    user_id: userId, source, secret: sealSession(s), last_sync: now.toISOString(), expires_at: new Date(now.getTime() + DEFAULT_TTL[source]).toISOString(),
  });
  return !error;
}

export async function loadLink(userId: string, source: SchoolSource): Promise<SchoolSession | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data } = await db.from("school_links").select("secret, expires_at").eq("user_id", userId).eq("source", source).maybeSingle();
  if (!data) return null;
  if (data.expires_at && Date.parse(data.expires_at) < Date.now()) {
    await removeLink(userId, source);
    return null;
  }
  return openSession(data.secret);
}

/** После обновления: eMaktab мог выдать новые cookie — сохраняем, отмечаем время. */
export async function touchLink(userId: string, source: SchoolSource, s: SchoolSession) {
  const db = supabaseAdmin();
  if (!db) return;
  await db.from("school_links").update({ secret: sealSession(s), last_sync: new Date().toISOString() }).eq("user_id", userId).eq("source", source);
}

export async function removeLink(userId: string, source: SchoolSource) {
  const db = supabaseAdmin();
  if (!db) return;
  await db.from("school_links").delete().eq("user_id", userId).eq("source", source);
}

export async function listLinks(userId: string): Promise<{ source: SchoolSource; last_sync: string | null; expires_at: string | null }[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  const { data } = await db.from("school_links").select("source, last_sync, expires_at").eq("user_id", userId);
  return (data ?? []) as { source: SchoolSource; last_sync: string | null; expires_at: string | null }[];
}
