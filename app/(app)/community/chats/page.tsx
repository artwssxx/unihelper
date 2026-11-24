"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { api, Avatar, ReportButton, timeAgo } from "@/components/community/ui";
import * as I from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { looksLikeContact, type ChatSummary, type Message } from "@/lib/community";

export default function ChatsPage() {
  return (
    <Suspense fallback={null}>
      <Chats />
    </Suspense>
  );
}

function Chats() {
  const { ready, user } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const active = params.get("c");
  const [list, setList] = useState<ChatSummary[] | null>(null);

  const loadList = useCallback(async () => {
    const r = await api<{ items: ChatSummary[] }>("/api/community/chats");
    if (r.ok) setList(r.data.items);
    else setList([]);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadList();
    const id = setInterval(() => document.visibilityState === "visible" && loadList(), 15000);
    return () => clearInterval(id);
  }, [user, loadList]);

  if (!ready) return null;
  if (!user) {
    return (
      <div className="card space-y-3">
        <h1 className="text-2xl font-extrabold">Чаты</h1>
        <p className="text-body">Войди, чтобы переписываться с участниками комьюнити.</p>
        <Link href="/login?next=/community/chats" className="btn-primary w-fit">Войти</Link>
      </div>
    );
  }
  const current = list?.find((c) => c.id === active) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/community" className="text-sm font-bold text-primary">← Комьюнити</Link>
          <h1 className="mt-1 text-[30px] font-extrabold tracking-tight">Чаты</h1>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <aside className={`card min-w-0 p-2 ${active ? "hidden lg:block" : ""}`} aria-label="Список чатов">
          {list === null ? (
            <p className="p-3 text-muted">Загрузка…</p>
          ) : list.length === 0 ? (
            <p className="p-3 text-sm text-body">Чатов пока нет. Напиши автору проекта или участнику из раздела «Люди», или вступи в организацию.</p>
          ) : (
            <ul className="space-y-1">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${c.id === active ? "bg-primary-soft" : "hover:bg-line-3"}`}
                    onClick={() => router.replace(`/community/chats?c=${c.id}`)}
                  >
                    {c.kind === "org" ? (
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-line-3 text-body"><I.Users size={18} /></span>
                    ) : (
                      <Avatar name={c.title} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-bold">{c.title}</span>
                        <span className="flex-none text-[11px] text-muted">{timeAgo(c.lastMessageAt)}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-muted">{c.lastMessage ?? "Нет сообщений"}</span>
                        {c.unread > 0 && <span className="min-w-5 flex-none rounded-full bg-orange px-1.5 text-center text-xs font-extrabold leading-5 text-white">{c.unread}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section className={`min-w-0 ${active ? "" : "hidden lg:block"}`}>
          {active ? (
            <Conversation key={active} chatId={active} summary={current} onBack={() => router.replace("/community/chats")} onSent={loadList} />
          ) : (
            <div className="card flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-center text-body">
              <I.Chat size={28} />
              <p>Выбери чат слева.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Conversation({ chatId, summary, onBack, onSent }: { chatId: string; summary: ChatSummary | null; onBack: () => void; onSent: () => void }) {
  const [msgs, setMsgs] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [warn, setWarn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const lastId = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  const pull = useCallback(async () => {
    const r = await api<{ items: Message[] }>(`/api/community/chats/${chatId}/messages${lastId.current ? `?after=${lastId.current}` : ""}`);
    if (!r.ok) {
      if (r.status === 404) setErr("Чат не найден или ты больше не участник.");
      setMsgs((m) => m ?? []);
      return;
    }
    if (r.data.items.length) {
      lastId.current = r.data.items[r.data.items.length - 1].id;
      setMsgs((m) => [...(m ?? []), ...r.data.items.filter((x) => !(m ?? []).some((y) => y.id === x.id))]);
    } else setMsgs((m) => m ?? []);
  }, [chatId]);

  useEffect(() => {
    pull();
    const id = setInterval(() => document.visibilityState === "visible" && pull(), 4000);
    return () => clearInterval(id);
  }, [pull]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [msgs?.length]);

  async function send(force = false) {
    const body = text.trim();
    if (!body) return;
    if (!force && looksLikeContact(body)) return setWarn(true);
    setWarn(false);
    setErr(null);
    const r = await api(`/api/community/chats/${chatId}/messages`, { method: "POST", json: { body } });
    if (!r.ok) return setErr(r.data.message ?? "Не отправилось. Попробуй ещё раз.");
    setText("");
    await pull();
    onSent();
  }

  async function block() {
    if (!summary?.peerId) return;
    await api("/api/community/block", { method: "POST", json: { userId: summary.peerId, block: true } });
    setBlocked(true);
  }

  return (
    <div className="card flex h-[calc(100dvh-220px)] min-h-[420px] flex-col p-0">
      <header className="flex items-center gap-3 border-b border-line-3 px-4 py-3">
        <button className="text-primary lg:hidden" onClick={onBack} aria-label="Назад к списку">←</button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-extrabold">{summary?.title ?? "Чат"}</div>
          <div className="text-xs text-muted">{summary?.kind === "org" ? "общий чат организации" : "личные сообщения"}</div>
        </div>
        {summary?.kind === "direct" && summary.peerId && !blocked && (
          <>
            <ReportButton type="profile" id={summary.peerId} />
            <button className="text-xs font-bold text-muted hover:text-red" onClick={block}>Заблокировать</button>
          </>
        )}
      </header>
      <div ref={box} className="flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
        {msgs === null ? (
          <p className="text-muted">Загрузка…</p>
        ) : msgs.length === 0 ? (
          <div className="mx-auto max-w-[420px] space-y-3 pt-6 text-center text-sm text-body">
            <p>Напиши первым: представься и расскажи, чем хочешь заниматься.</p>
          </div>
        ) : (
          msgs.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div className={`group max-w-[82%] rounded-2xl px-3.5 py-2 ${m.mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-line-3"}`}>
                {!m.mine && summary?.kind === "org" && <div className="text-xs font-bold text-primary">{m.author}</div>}
                <p className="whitespace-pre-line break-words text-[15px]">{m.body}</p>
                <div className={`mt-0.5 flex items-center gap-2 text-[11px] ${m.mine ? "text-white/75" : "text-muted"}`}>
                  {new Date(m.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  {!m.mine && <ReportButton type="message" id={m.id} className="opacity-0 group-hover:opacity-100 focus:opacity-100" />}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <footer className="space-y-2 border-t border-line-3 p-3">
        {blocked && <p className="text-sm font-semibold text-muted">Участник заблокирован. Переписка недоступна.</p>}
        {warn && (
          <div className="rounded-xl bg-orange-soft px-3 py-2.5 text-sm text-orange-ink-2">
            Похоже, в сообщении телефон, адрес или контакт. Лучше общаться здесь, пока вы не знакомы.
            <div className="mt-1.5 flex gap-3">
              <button className="font-bold" onClick={() => setWarn(false)}>Исправить</button>
              <button className="font-bold underline" onClick={() => send(true)}>Всё равно отправить</button>
            </div>
          </div>
        )}
        {err && <p className="text-sm font-semibold text-red">{err}</p>}
        {!blocked && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              className="input max-h-32 min-h-11 flex-1 resize-none py-2.5"
              rows={1}
              value={text}
              maxLength={2000}
              placeholder="Сообщение"
              aria-label="Сообщение"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button type="submit" className="btn-primary h-11 w-11 flex-none p-0" aria-label="Отправить" disabled={!text.trim()}>
              <I.Send size={18} />
            </button>
          </form>
        )}
      </footer>
    </div>
  );
}
