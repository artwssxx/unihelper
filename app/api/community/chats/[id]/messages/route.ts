import { NextResponse } from "next/server";
import { z } from "zod";
import type { Message } from "@/lib/community";
import { blockedSet, communityCtx, isChatMember, isResponse, profilesFor } from "@/lib/server/community";
import { takeQuota } from "@/lib/server/rateLimit";

const uuid = z.string().uuid();

// Сообщения чата. ?after=<id> — только новые (для опроса раз в несколько секунд).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (!(await isChatMember(c.db, id, c.user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  let q = c.db.from("community_messages").select("id,user_id,body,created_at").eq("chat_id", id).eq("hidden", false);
  q = after ? q.gt("id", after).order("id", { ascending: true }).limit(200) : q.order("id", { ascending: false }).limit(100);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  const rows = after ? (data ?? []) : (data ?? []).reverse();
  const people = await profilesFor(c.db, rows.map((r) => r.user_id));
  const blocked = await blockedSet(c.db, c.user.id);
  const items: Message[] = rows
    .filter((r) => !r.user_id || !blocked.has(r.user_id))
    .map((r) => ({
      id: r.id, userId: r.user_id, body: r.body, createdAt: r.created_at, mine: r.user_id === c.user.id,
      author: (r.user_id && people.get(r.user_id)?.name) || "Участник",
    }));
  await c.db.from("community_chat_members").update({ last_read_at: new Date().toISOString() }).eq("chat_id", id).eq("user_id", c.user.id);
  return NextResponse.json({ items });
}

const body = z.object({ body: z.string().trim().min(1).max(2000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", message: "Пустое или слишком длинное сообщение." }, { status: 400 });
  if (!(await isChatMember(c.db, id, c.user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!takeQuota(`id:${c.user.id}:msgs`, 400).ok) return NextResponse.json({ error: "rate_limited", message: "Слишком много сообщений за день." }, { status: 429 });

  const { data: chat } = await c.db.from("community_chats").select("kind").eq("id", id).single();
  if (chat?.kind === "direct") {
    const { data: members } = await c.db.from("community_chat_members").select("user_id").eq("chat_id", id);
    const peer = (members ?? []).find((m) => m.user_id !== c.user.id)?.user_id;
    if (peer && (await blockedSet(c.db, c.user.id)).has(peer)) {
      return NextResponse.json({ error: "blocked", message: "Переписка с этим участником недоступна." }, { status: 403 });
    }
  }
  const now = new Date().toISOString();
  const { data, error } = await c.db.from("community_messages").insert({ chat_id: id, user_id: c.user.id, body: parsed.data.body }).select("id,created_at").single();
  if (error || !data) return NextResponse.json({ error: "db" }, { status: 500 });
  await Promise.all([
    c.db.from("community_chats").update({ last_message_at: now }).eq("id", id),
    c.db.from("community_chat_members").update({ last_read_at: now }).eq("chat_id", id).eq("user_id", c.user.id),
  ]);
  return NextResponse.json({ ok: true, id: data.id });
}
