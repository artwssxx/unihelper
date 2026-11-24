"use client";

import { track } from "@/lib/analytics";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import NeedProfile from "@/components/NeedProfile";
import { useProfile } from "@/lib/useProfile";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = ["Хватит ли мне IELTS 6.5?", "С чего начать подготовку к Stipendium Hungaricum?", "Что мне подтянуть в первую очередь?", "Как написать эссе без клише?"];

export default function Assistant() {
  const { profile, store } = useProfile();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    if (!profile || !text.trim() || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setNotice(null);
    track("ai_question");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, profileId: store?.profileId ?? null, messages: history.slice(-20) }),
      });
      if (res.status === 429) {
        setMessages(history);
        setNotice("Лимит 20 сообщений в день исчерпан. В Pro лимит больше — или возвращайся завтра.");
        return;
      }
      if (!res.ok || !res.body) throw new Error();
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

  // Вопрос с главной: /assistant?q=…
  useEffect(() => {
    if (!profile || autoSent.current) return;
    const q = new URLSearchParams(location.search).get("q");
    if (q) {
      autoSent.current = true;
      if (q === "essay") location.replace("/essays");
      else send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (profile === undefined) return null;
  if (profile === null) return <NeedProfile text="AI Advisor отвечает с учётом твоего профиля." />;

  return (
    <div className="mx-auto flex min-h-[72vh] max-w-[860px] flex-col gap-5">
      <section className="rounded-[22px] bg-inv p-6 text-white">
        <h1 className="m-0 text-2xl font-extrabold">AI Advisor</h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-text">
          Спроси про программы, гранты или эссе — отвечаю с учётом твоего профиля и подборки. Не выдумываю дедлайны и суммы: если данных нет, отправлю на официальный сайт. Эссе за тебя не пишу.
        </p>
        {messages.length === 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full border border-navy-line bg-navy-2 px-3 py-2 text-[13px] font-semibold text-white">{s}</button>
            ))}
            <Link href="/essays" className="rounded-full border border-navy-line bg-navy-2 px-3 py-2 text-[13px] font-semibold text-white">Проверь моё эссе</Link>
          </div>
        )}
      </section>

      <div className="flex-1 space-y-3" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === "user" ? "ml-auto bg-primary text-white" : "border border-line bg-surface"}`}>
            {m.content || <span className="text-muted">Думаю…</span>}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {notice && <p className="rounded-2xl bg-orange-soft px-4 py-3 text-sm font-semibold text-orange-ink-2">{notice}</p>}

      <form className="sticky bottom-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <label htmlFor="ask" className="sr-only">Вопрос</label>
        <input id="ask" className="input flex-1" placeholder="Спроси про вузы, гранты, эссе…" value={input} onChange={(e) => setInput(e.target.value)} maxLength={4000} />
        <button className="btn-primary" disabled={busy || !input.trim()} aria-label="Отправить">→</button>
      </form>
    </div>
  );
}
