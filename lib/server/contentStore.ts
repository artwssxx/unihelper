import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PROGRAMS } from "@/data/programs";
import { EVENTS } from "@/lib/content/events";
import { LESSONS } from "@/lib/content/lessons";
import { POSTS } from "@/lib/content/posts";
import { CONTENT_KINDS, type ContentKind } from "@/lib/content/schemas";
import { supabaseAdmin } from "./supabase";

// Контент = значения из кода + правки из админки поверх.
// Хранилище правок: Supabase (таблица content_items), иначе локальный файл .data/content.json
// (только для локальной разработки: на Vercel файловая система только для чтения).

type Override = { data: Record<string, unknown> | null; updatedAt: string };
type Overrides = Record<ContentKind, Record<string, Override>>;

const DEFAULTS: Record<ContentKind, { id: string }[]> = {
  programs: PROGRAMS,
  events: EVENTS,
  lessons: LESSONS,
  posts: POSTS,
};

const FILE = path.join(process.cwd(), ".data", "content.json");
const empty = (): Overrides => ({ programs: {}, events: {}, lessons: {}, posts: {} });

export function storageMode(): "supabase" | "file" | "readonly" {
  if (supabaseAdmin()) return "supabase";
  return process.env.VERCEL ? "readonly" : "file";
}

async function readOverrides(): Promise<Overrides> {
  const db = supabaseAdmin();
  if (db) {
    const { data, error } = await db.from("content_items").select("kind,id,data,deleted,updated_at");
    if (error) {
      console.error("[content] read", error.message);
      return empty();
    }
    const o = empty();
    for (const r of data ?? []) {
      if (r.kind in o) o[r.kind as ContentKind][r.id] = { data: r.deleted ? null : r.data, updatedAt: r.updated_at };
    }
    return o;
  }
  if (process.env.VERCEL) return empty();
  try {
    return { ...empty(), ...JSON.parse(await fs.readFile(FILE, "utf8")) };
  } catch {
    return empty();
  }
}

async function writeOverride(kind: ContentKind, id: string, data: Record<string, unknown> | null | "reset") {
  const db = supabaseAdmin();
  if (db) {
    const res = data === "reset"
      ? await db.from("content_items").delete().eq("kind", kind).eq("id", id)
      : await db.from("content_items").upsert({ kind, id, data, deleted: data === null, updated_at: new Date().toISOString() });
    if (res.error) throw new Error(res.error.message);
    return;
  }
  if (process.env.VERCEL) throw new Error("readonly");
  const o = await readOverrides();
  if (data === "reset") delete o[kind][id];
  else o[kind][id] = { data, updatedAt: new Date().toISOString() };
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(o, null, 2));
}

export interface AdminItem {
  id: string;
  data: Record<string, unknown> | null;
  source: "code" | "edited" | "added" | "deleted";
  updatedAt?: string;
}

/** Для админки: все элементы с пометкой источника. */
export async function listForAdmin(kind: ContentKind): Promise<AdminItem[]> {
  const o = (await readOverrides())[kind];
  const out: AdminItem[] = DEFAULTS[kind].map((d) => {
    const ov = o[d.id];
    if (!ov) return { id: d.id, data: d as unknown as Record<string, unknown>, source: "code" };
    return { id: d.id, data: ov.data ?? (d as unknown as Record<string, unknown>), source: ov.data ? "edited" : "deleted", updatedAt: ov.updatedAt };
  });
  for (const [id, ov] of Object.entries(o)) {
    if (!DEFAULTS[kind].some((d) => d.id === id) && ov.data) out.push({ id, data: ov.data, source: "added", updatedAt: ov.updatedAt });
  }
  return out;
}

/** Для сайта: итоговый контент (удалённые скрыты, невалидные правки игнорируются). */
export async function getContent<K extends ContentKind>(kind: K): Promise<unknown[]> {
  const items = await listForAdmin(kind);
  const schema = CONTENT_KINDS[kind];
  return items
    .filter((i) => i.source !== "deleted" && i.data)
    .map((i) => {
      const p = schema.safeParse(i.data);
      if (p.success) return p.data;
      const d = DEFAULTS[kind].find((x) => x.id === i.id);
      return d ?? null;
    })
    .filter(Boolean);
}

export async function saveItem(kind: ContentKind, data: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = CONTENT_KINDS[kind].safeParse(data);
  if (!p.success) return { ok: false, error: p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  await writeOverride(kind, p.data.id, p.data as Record<string, unknown>);
  return { ok: true };
}

export async function deleteItem(kind: ContentKind, id: string) {
  const isDefault = DEFAULTS[kind].some((d) => d.id === id);
  await writeOverride(kind, id, isDefault ? null : "reset");
}

export async function resetItem(kind: ContentKind, id: string) {
  await writeOverride(kind, id, "reset");
}
