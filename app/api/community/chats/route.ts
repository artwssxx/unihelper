import { NextResponse } from "next/server";
import { z } from "zod";
import { directKey, type ChatSummary } from "@/lib/community";
import { blockedSet, communityCtx, hasProfile, isResponse, needProfile, profilesFor } from "@/lib/server/community";
import { takeQuota } from "@/lib/server/rateLimit";

// Мои чаты: последние сообщения и число непрочитанных.
export async function GET(req: Request) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const { data: mine } = await c.db.from("community_chat_members").select("chat_id,last_read_at").eq("user_id", c.user.id);
  const ids = (mine ?? []).map((m) => m.chat_id);
  if (!ids.length) return NextResponse.json({ items: [] });
  const [{ data: chats }, { data: members }, { data: msgs }] = await Promise.all([
    c.db.from("community_chats").select("id,kind,org_id,last_message_at").in("id", ids),
    c.db.from("community_chat_members").select("chat_id,user_id").in("chat_id", ids),
    c.db.from("community_messages").select("chat_id,user_id,body,created_at,hidden").in("chat_id", ids).order("id", { ascending: false }).limit(500),
  ]);
  const orgIds = (chats ?? []).map((x) => x.org_id).filter(Boolean) as string[];
  const { data: orgs } = orgIds.length ? await c.db.from("community_orgs").select("id,name").in("id", orgIds) : { data: [] };
  const peers = (members ?? []).filter((m) => m.user_id !== c.user.id);
  const people = await profilesFor(c.db, peers.map((p) => p.user_id));
  const items: ChatSummary[] = (chats ?? [])
    .map((ch) => {
      const readAt = mine!.find((m) => m.chat_id === ch.id)?.last_read_at ?? "1970-01-01";
      const own = (msgs ?? []).filter((m) => m.chat_id === ch.id && !m.hidden);
      const peerId = ch.kind === "direct" ? (peers.find((p) => p.chat_id === ch.id)?.user_id ?? null) : null;
      const title = ch.kind === "org" ? (orgs ?? []).find((o) => o.id === ch.org_id)?.name ?? "Организация" : (peerId && people.get(peerId)?.name) || "Участник";
      return {
        id: ch.id, kind: ch.kind, title, peerId,
        lastMessage: own[0]?.body.slice(0, 120) ?? null,
        lastMessageAt: own[0]?.created_at ?? ch.last_message_at,
        unread: own.filter((m) => m.user_id !== c.user.id && m.created_at > readAt).length,
      } satisfies ChatSummary;
    })
    .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
  return NextResponse.json({ items });
}

// Начать личный чат с участником (или открыть существующий).
const body = z.object({ userId: z.string().uuid() });

export async function POST(req: Request) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  if (!(await hasProfile(c.db, c.user.id))) return needProfile();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.userId === c.user.id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const peer = parsed.data.userId;
  const { data: prof } = await c.db.from("community_profiles").select("user_id,hidden_by_admin").eq("user_id", peer).maybeSingle();
  if (!prof || prof.hidden_by_admin) return NextResponse.json({ error: "not_found", message: "Участник не найден." }, { status: 404 });
  if ((await blockedSet(c.db, c.user.id)).has(peer)) return NextResponse.json({ error: "blocked", message: "Переписка с этим участником недоступна." }, { status: 403 });

  const key = directKey(c.user.id, peer);
  const { data: existing } = await c.db.from("community_chats").select("id").eq("direct_key", key).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, id: existing.id });
  if (!takeQuota(`id:${c.user.id}:newchats`, 30).ok) return NextResponse.json({ error: "rate_limited", message: "Слишком много новых чатов за день." }, { status: 429 });
  const { data: chat, error } = await c.db.from("community_chats").insert({ kind: "direct", direct_key: key }).select("id").single();
  if (error || !chat) {
    const { data: again } = await c.db.from("community_chats").select("id").eq("direct_key", key).maybeSingle();
    if (again) return NextResponse.json({ ok: true, id: again.id });
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  // У строк одинаковый набор полей: при пакетной вставке недостающее поле стало бы NULL, и вставка упала бы целиком.
  const { error: memErr } = await c.db.from("community_chat_members").insert([
    { chat_id: chat.id, user_id: c.user.id, last_read_at: new Date().toISOString() },
    { chat_id: chat.id, user_id: peer, last_read_at: "1970-01-01T00:00:00Z" },
  ]);
  if (memErr) {
    await c.db.from("community_chats").delete().eq("id", chat.id);
    return NextResponse.json({ error: "db", message: "Не удалось открыть чат." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: chat.id });
}
