import "server-only";
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { levelOf } from "@/lib/coins";
import { childSummary, type ChildData, type ChildSummary } from "@/lib/family";
import { SITE_URL } from "@/lib/site";
import type { Profile, Program } from "@/lib/types";
import { getUser, type AuthUser } from "./auth";
import { getContent } from "./contentStore";
import { supabaseAdmin } from "./supabase";

// Родители и дети. Родитель видит прогресс ребёнка только после согласия ребёнка:
// ребёнок дал свой код или принял приглашение. Ребёнок может отключить родителя в профиле.

export type FamilyCtx = { user: AuthUser; db: SupabaseClient };

export async function familyCtx(req: Request): Promise<FamilyCtx | NextResponse> {
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "no_database" }, { status: 503 });
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized", message: "Войдите в аккаунт." }, { status: 401 });
  return { user, db };
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // без похожих символов (0/O, 1/I/L)
const code = (len: number) => Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

async function displayName(db: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await db.from("user_state").select("display_name, data").eq("user_id", userId).maybeSingle();
  const contact = (data?.data as { contact?: { fullName?: string } } | null)?.contact;
  return contact?.fullName || data?.display_name || null;
}

/** Код ребёнка для родителей (создаётся при первом запросе). */
export async function childCode(db: SupabaseClient, userId: string): Promise<string> {
  const { data } = await db.from("user_state").select("parent_code").eq("user_id", userId).maybeSingle();
  if (data?.parent_code) return data.parent_code;
  for (let i = 0; i < 5; i++) {
    const c = code(6);
    const { error } = await db.from("user_state").upsert({ user_id: userId, parent_code: c }, { onConflict: "user_id" });
    if (!error) return c;
  }
  throw new Error("code_failed");
}

/** Родитель добавляет ребёнка по его коду (ребёнок дал код — это согласие). */
export async function addByCode(db: SupabaseClient, parentId: string, raw: string): Promise<{ ok: boolean; message?: string }> {
  const c = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const { data: st } = await db.from("user_state").select("user_id").eq("parent_code", c).maybeSingle();
  if (!st) return { ok: false, message: "Код не найден. Попросите ребёнка открыть «Профиль» → «Родители» и продиктовать код." };
  if (st.user_id === parentId) return { ok: false, message: "Это ваш собственный код — его нужно ввести в аккаунте родителя." };
  const name = (await displayName(db, st.user_id)) ?? "Ребёнок";
  const { error } = await db.from("parent_links").insert({ parent_id: parentId, child_id: st.user_id, child_name: name.slice(0, 60), status: "active", accepted_at: new Date().toISOString() });
  if (error && !/duplicate|unique/i.test(error.message)) return { ok: false, message: "Не получилось добавить. Попробуйте ещё раз." };
  return { ok: true };
}

/** Родитель регистрирует ребёнка: анкету заполняет сам, ребёнку — ссылка-приглашение. */
export async function addNew(db: SupabaseClient, parentId: string, name: string, profile: Profile): Promise<{ ok: boolean; inviteUrl?: string; message?: string }> {
  const { count } = await db.from("parent_links").select("id", { count: "exact", head: true }).eq("parent_id", parentId);
  if ((count ?? 0) >= 10) return { ok: false, message: "Можно добавить до 10 детей." };
  for (let i = 0; i < 5; i++) {
    const invite = code(10);
    const { error } = await db.from("parent_links").insert({ parent_id: parentId, child_name: name.slice(0, 60), child_profile: profile, invite_code: invite, status: "pending" });
    if (!error) return { ok: true, inviteUrl: `${SITE_URL}/join/${invite}` };
  }
  return { ok: false, message: "Не получилось создать приглашение. Попробуйте ещё раз." };
}

/** Что показать на странице приглашения (без входа): кто приглашает и кого. */
export async function inviteInfo(db: SupabaseClient, invite: string) {
  const { data } = await db.from("parent_links").select("parent_id, child_name, status").eq("invite_code", invite).maybeSingle();
  if (!data || data.status !== "pending") return null;
  return { childName: data.child_name, parentName: (await displayName(db, data.parent_id)) ?? "Родитель" };
}

/** Ребёнок принимает приглашение: связь становится активной, анкета от родителя — в его профиль, если своей нет. */
export async function claimInvite(db: SupabaseClient, childId: string, invite: string): Promise<{ ok: boolean; message?: string }> {
  const { data: link } = await db.from("parent_links").select("id, parent_id, child_profile, status").eq("invite_code", invite).maybeSingle();
  if (!link || link.status !== "pending") return { ok: false, message: "Приглашение не найдено или уже принято." };
  if (link.parent_id === childId) return { ok: false, message: "Это ваше приглашение — откройте ссылку на телефоне ребёнка." };
  const { error } = await db.from("parent_links").update({ child_id: childId, status: "active", accepted_at: new Date().toISOString(), invite_code: null }).eq("id", link.id);
  if (error) return { ok: false, message: /duplicate|unique/i.test(error.message) ? "Этот родитель уже подключён." : "Не получилось принять приглашение." };
  const { data: st } = await db.from("user_state").select("data").eq("user_id", childId).maybeSingle();
  const data = (st?.data ?? {}) as { profile?: unknown };
  if (!data.profile && link.child_profile) {
    await db.from("user_state").upsert({ user_id: childId, data: { ...data, profile: link.child_profile }, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  }
  return { ok: true };
}

/** Сводки по всем детям родителя. */
export async function listChildren(db: SupabaseClient, parentId: string): Promise<ChildSummary[]> {
  const { data: links } = await db.from("parent_links").select("id, child_id, child_name, child_profile, invite_code, status").eq("parent_id", parentId).order("created_at");
  if (!links?.length) return [];
  const ids = links.map((l) => l.child_id).filter(Boolean) as string[];
  const [programs, states, ledger] = await Promise.all([
    getContent("programs") as Promise<Program[]>,
    ids.length ? db.from("user_state").select("user_id, data, updated_at, streak_days").in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string; data: unknown; updated_at: string; streak_days: number | null }[] }),
    ids.length ? db.from("coin_ledger").select("user_id, delta").in("user_id", ids).limit(20000) : Promise.resolve({ data: [] as { user_id: string; delta: number }[] }),
  ]);
  return links.map((l) => {
    if (l.status !== "active" || !l.child_id) {
      return childSummary({ linkId: l.id, status: "pending", name: l.child_name, inviteUrl: l.invite_code ? `${SITE_URL}/join/${l.invite_code}` : null, data: { profile: l.child_profile as Profile | null }, programs });
    }
    const st = states.data?.find((s) => s.user_id === l.child_id);
    const rows = (ledger.data ?? []).filter((r) => r.user_id === l.child_id);
    const xp = rows.reduce((s, r) => s + Math.max(0, r.delta), 0);
    const lvl = levelOf(xp);
    return childSummary({
      linkId: l.id,
      status: "active",
      name: l.child_name,
      data: (st?.data ?? {}) as ChildData,
      programs,
      coins: { balance: rows.reduce((s, r) => s + r.delta, 0), level: lvl.level, title: lvl.title, streak: st?.streak_days ?? 0 },
      lastActive: st?.updated_at ?? null,
    });
  });
}

/** Родители, подключённые к ребёнку (для его профиля). */
export async function listParents(db: SupabaseClient, childId: string) {
  const { data } = await db.from("parent_links").select("id, parent_id, accepted_at").eq("child_id", childId).eq("status", "active");
  return Promise.all((data ?? []).map(async (l) => ({ id: l.id, name: (await displayName(db, l.parent_id)) ?? "Родитель", since: l.accepted_at })));
}

/** Удалить связь: может родитель (своего ребёнка) или ребёнок (своего родителя). */
export async function removeLink(db: SupabaseClient, userId: string, id: string): Promise<boolean> {
  const { data } = await db.from("parent_links").delete().eq("id", id).or(`parent_id.eq.${userId},child_id.eq.${userId}`).select("id");
  return Boolean(data?.length);
}
