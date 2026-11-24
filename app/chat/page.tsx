"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { load } from "@/lib/clientStore";
import type { Profile } from "@/lib/types";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "С чего начать подготовку к Stipendium Hungaricum?",
  "Что мне подтянуть в первую очередь?",
  "Как написать личное эссе без клише?",
];

export default function Chat() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = load();
    setProfile(s.profile ?? null);
    setProfileId(s.profileId ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!profile || !text.trim() || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, profileId, messages: history.slice(-20) }),
      });
      if (res.status === 429) {
        setMessages(history);
        setNotice("Лимит 20 сообщений в день исчерпан. С Pro лимит больше — или возвращайся завтра.");
        return;
      }
      if (!res.ok || !res.body) throw new Error("bad");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc }]);
      }
    } catch {
      setMessages(history);
      setNotice("Не удалось получить ответ. Попробуй ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (!profile) {
    return (
      <div className="card mt-6 space-y-4 text-center">
        <p>ИИ-помощник отвечает с учётом твоего профиля. Сначала пройди анкету.</p>
        <Link href="/quiz" className="btn-primary">Пройти оценку</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col gap-4 pt-2">
      <div>
        <h1 className="text-xl font-bold">ИИ-помощник</h1>
        <p className="text-sm text-muted">Знает твой профиль и подборку. Советует, но не пишет эссе за тебя и не выдумывает дедлайны.</p>
      </div>

      <div className="flex-1 space-y-3">
        {messages.length === 0 && (
          <div className="grid gap-2">
            {STARTERS.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "ml-auto bg-accent text-accent-fg" : "border border-border bg-surface"}`}
          >
            {m.content || <span className="text-muted">Думаю…</span>}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {notice && <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">{notice}</p>}

      <form
        className="sticky bottom-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input className="input flex-1" placeholder="Спроси про вузы, гранты, эссе…" value={input} onChange={(e) => setInput(e.target.value)} maxLength={4000} />
        <button className="btn-primary" disabled={busy || !input.trim()}>→</button>
      </form>
    </div>
  );
}
