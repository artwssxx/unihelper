import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { PublicProfile } from "@/lib/community";
import { getUser, type AuthUser } from "./auth";
import { supabaseAdmin } from "./supabase";

export type Ctx = { user: AuthUser; db: SupabaseClient };

/** Все API комьюнити — только для вошедших и только при подключённой базе. */
export async function communityCtx(req: Request): Promise<Ctx | NextResponse> {
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "no_database", message: "Комьюнити работает только с подключённой базой." }, { status: 503 });
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized", message: "Войдите, чтобы пользоваться комьюнити." }, { status: 401 });
  return { user, db };
}

export const isResponse = (x: unknown): x is NextResponse => x instanceof NextResponse;

type ProfileRow = {
  user_id: string; display_name: string; grade: number | null; city: string | null; major: string | null;
  bio: string; skills: string[]; looking_for: string; visible: boolean; hidden_by_admin: boolean;
};

export const PROFILE_COLS = "user_id,display_name,grade,city,major,bio,skills,looking_for,visible,hidden_by_admin";

export function toPublic(r: ProfileRow): PublicProfile {
  if (r.hidden_by_admin) return { userId: r.user_id, name: "Участник", grade: null, city: null, major: null, bio: "", skills: [], lookingFor: "" };
  return { userId: r.user_id, name: r.display_name, grade: r.grade, city: r.city, major: r.major, bio: r.bio, skills: r.skills ?? [], lookingFor: r.looking_for };
}

export async function profilesFor(db: SupabaseClient, ids: (string | null)[]): Promise<Map<string, PublicProfile>> {
  const uniq = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  const map = new Map<string, PublicProfile>();
  if (!uniq.length) return map;
  const { data } = await db.from("community_profiles").select(PROFILE_COLS).in("user_id", uniq);
  for (const r of (data ?? []) as ProfileRow[]) map.set(r.user_id, toPublic(r));
  return map;
}

export async function hasProfile(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.from("community_profiles").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

/** Кого я заблокировал и кто заблокировал меня. */
export async function blockedSet(db: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data } = await db.from("community_blocks").select("blocker_id,blocked_id").or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  const s = new Set<string>();
  for (const r of data ?? []) s.add(r.blocker_id === userId ? r.blocked_id : r.blocker_id);
  return s;
}

export async function isChatMember(db: SupabaseClient, chatId: string, userId: string): Promise<boolean> {
  const { data } = await db.from("community_chat_members").select("chat_id").eq("chat_id", chatId).eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

export const needProfile = () =>
  NextResponse.json({ error: "no_profile", message: "Сначала заполни карточку участника — так другие поймут, кто пишет." }, { status: 409 });
