"use client";

import { track } from "@/lib/analytics";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CatMascot, { type CatMood } from "@/components/advisor/CatMascot";
import RichText from "@/components/advisor/RichText";
import { Globe, Pen, Send, Spark, Target } from "@/components/icons";
import NeedProfile from "@/components/NeedProfile";
import { countryName } from "@/lib/countries";
import { majorsLabel } from "@/lib/majorsLabel";
import { useProfile } from "@/lib/useProfile";
import { apiFetch } from "@/lib/auth";
import { CoinUnlockButton } from "@/components/ProLock";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  { q: "Хватит ли мне IELTS 6.5?", hint: "сравню с требованиями твоих вузов", Icon: Target, tone: "bg-primary-soft text-primary-ink" },
  { q: "С чего начать подготовку к Stipendium Hungaricum?", hint: "шаги и документы по порядку", Icon: Globe, tone: "bg-orange-soft text-orange-ink-2" },
  { q: "Что мне подтянуть в первую очередь?", hint: "по силе профиля и оценкам", Icon: Spark, tone: "bg-green-soft text-green" },
];
const FOLLOWUPS = ["Составь план на ближайший месяц", "Какие гранты подходят под мой профиль?", "Какие вузы взять запасным вариантом?", "Что написать в эссе о себе?"];
const TIPS = [
  "Спроси, хватит ли твоего IELTS для выбранных вузов.",
  "Могу составить план подготовки на месяц.",
  "Расскажу, какие гранты есть в твоих странах.",
  "Подскажу, какие активности усилят профиль.",
];
const SAVE_KEY = "uh-advisor-chat";

export default function Assistant() {
  const { profile, store } = useProfile();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mood, setMood] = useState<CatMood>("wave");
  const [tip, setTip] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const autoSent = useRef(false);

  // Разговор живёт до закрытия вкладки — переходы по сайту его не сбрасывают.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SAVE_KEY) || "[]") as Msg[];
      if (Array.isArray(saved) && saved.length) setMessages(saved.filter((m) => m.content));
    } catch { /* нет хранилища — начинаем с чистого листа */ }
    const t = setTimeout(() => setMood((m) => (m === "wave" ? "idle" : m)), 3400);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (busy) return;
    try { sessionStorage.setItem(SAVE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* без сохранения */ }
  }, [messages, busy]);
  useEffect(() => {
    if (messages.length) return;
    const t = setInterval(() => setTip((x) => (x + 1) % TIPS.length), 6000);
    return () => clearInterval(t);
  }, [messages.length]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    if (!profile || !text.trim() || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    if (box.current) box.current.style.height = "";
    setBusy(true);
    setMood("thinking");
    setNotice(null);
    track("ai_question");
    let ok = false;
    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, profileId: store?.profileId ?? null, messages: history.slice(-20) }),
      });
      if (res.status === 429) {
        setMessages(history);
        setNotice("Дневной лимит сообщений исчерпан. В Pro лимит больше — или возьми +20 сообщений за UniCoins.");
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
      ok = acc.trim().length > 0;
      if (!ok) setMessages(history);
    } catch {
      setMessages(history);
      setNotice("Не удалось получить ответ. Попробуй ещё раз.");
    } finally {
      setBusy(false);
      setMood(ok ? "happy" : "idle");
      if (ok) setTimeout(() => setMood((m) => (m === "happy" ? "idle" : m)), 2600);
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

  const context = [
    profile.grade <= 11 ? `${profile.grade} класс` : `${profile.grade - 11} курс`,
    profile.ielts != null ? `IELTS ${profile.ielts}` : null,
    profile.sat != null ? `SAT ${profile.sat}` : null,
    majorsLabel(profile),
    profile.targetCountries.slice(0, 3).map(countryName).join(", ") + (profile.targetCountries.length > 3 ? ` +${profile.targetCountries.length - 3}` : ""),
  ].filter(Boolean) as string[];
  const asked = new Set(messages.filter((m) => m.role === "user").map((m) => m.content));
  const followups = FOLLOWUPS.filter((f) => !asked.has(f)).slice(0, 3);
  const last = messages[messages.length - 1];
  const waiting = busy && last?.role === "assistant" && !last.content;
  const bubble = busy ? "Думаю над ответом…" : mood === "happy" ? "Готово! Спрашивай ещё." : messages.length ? "Что ещё разберём?" : TIPS[tip];

  return (
    <div className="mx-auto flex min-h-[72vh] max-w-[880px] flex-col gap-4">
      <section className="advisor-hero relative overflow-hidden rounded-[26px] p-5 text-white sm:p-7">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-navy-text">AI Advisor</div>
            <h1 className="mt-2 text-[24px] font-extrabold leading-tight sm:text-[34px]">Привет! Я Юни — помогу с поступлением</h1>
            <p className="mt-2 max-w-[520px] text-sm leading-relaxed text-navy-text">
              Отвечаю с учётом твоего профиля и подборки. Не выдумываю дедлайны и суммы — если данных нет, отправлю на официальный сайт. Эссе за тебя не пишу, но помогу сделать его сильнее.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Что я учитываю">
              {context.map((c) => <span key={c} className="rounded-full bg-navy-2 px-2.5 py-1 text-xs font-semibold text-white">{c}</span>)}
            </div>
          </div>
          <div className="relative flex flex-none flex-col items-center self-end sm:self-center">
            <div key={bubble} className="tip-in mb-1 hidden max-w-[170px] rounded-2xl bg-surface-solid px-3 py-2 text-center text-xs font-semibold text-ink shadow-lg sm:block" aria-live="polite">{bubble}</div>
            <CatMascot mood={mood} size={128} className="h-auto w-[78px] sm:w-[128px]" />
          </div>
        </div>
      </section>

      {messages.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {STARTERS.map(({ q, hint, Icon, tone }) => (
            <button key={q} onClick={() => send(q)} className="card msg-in flex items-start gap-3 p-4 text-left transition-transform hover:-translate-y-0.5">
              <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span>
              <span><span className="block font-extrabold leading-snug">{q}</span><span className="mt-0.5 block text-sm text-muted">{hint}</span></span>
            </button>
          ))}
          <Link href="/essays" className="card msg-in flex items-start gap-3 p-4 transition-transform hover:-translate-y-0.5">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary-soft-2 text-primary-ink"><Pen size={20} /></span>
            <span><span className="block font-extrabold leading-snug">Проверь моё эссе</span><span className="mt-0.5 block text-sm text-muted">структура, клише, что усилить</span></span>
          </Link>
        </div>
      )}

      <div className="flex-1 space-y-3" aria-live="polite">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="msg-in flex justify-end">
              <div translate="no" className="advisor-bubble-me max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-br-md px-4 py-3 text-[15px] leading-relaxed shadow-sm">{m.content}</div>
            </div>
          ) : (
            <div key={i} className="msg-in flex items-end gap-2">
              <span className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-full bg-orange-soft"><CatMascot head size={30} mood={busy && i === messages.length - 1 ? "thinking" : "idle"} /></span>
              <div translate="no" className="max-w-[85%] rounded-[20px] rounded-bl-md border border-line bg-surface-solid px-4 py-3 text-[15px] leading-relaxed shadow-sm">
                {m.content ? <RichText text={m.content} /> : waiting && i === messages.length - 1 ? (
                  <span className="flex items-center gap-2 text-muted"><span className="flex gap-1"><i className="typing-dot" /><i className="typing-dot" /><i className="typing-dot" /></span> Юни думает…</span>
                ) : null}
              </div>
            </div>
          ),
        )}
        {!busy && messages.length > 0 && last?.role === "assistant" && followups.length > 0 && (
          <div className="msg-in flex flex-wrap gap-2 pl-11">
            {followups.map((f) => <button key={f} className="chip px-3 py-2 text-sm" onClick={() => send(f)}>{f}</button>)}
          </div>
        )}
        <div ref={bottom} />
      </div>

      {notice && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-orange-soft px-4 py-3 text-sm font-semibold text-orange-ink-2">
          <span>{notice}</span>
          {notice.includes("UniCoins") && <CoinUnlockButton item="chat_pack" onUnlocked={() => setNotice("Готово: +20 сообщений. Отправь вопрос ещё раз.")} className="py-2 text-sm" />}
        </div>
      )}

      <form className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 lg:bottom-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <div className="flex items-end gap-2 rounded-[24px] border border-line bg-surface-solid p-1.5 shadow-lg">
          <label htmlFor="ask" className="sr-only">Вопрос</label>
          <textarea
            id="ask" ref={box} rows={1} maxLength={4000}
            className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-muted"
            placeholder="Спроси Юни про вузы, гранты, эссе…" value={input}
            onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(144, e.target.scrollHeight)}px`; }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }}
          />
          {messages.length > 0 && !busy && (
            <button type="button" className="btn-secondary hidden h-11 flex-none px-3 text-sm sm:inline-flex" onClick={() => { setMessages([]); setNotice(null); setMood("wave"); setTimeout(() => setMood("idle"), 3400); }}>Новый чат</button>
          )}
          <button className="btn-primary h-11 w-11 flex-none rounded-full p-0" disabled={busy || !input.trim()} aria-label="Отправить"><Send size={18} /></button>
        </div>
      </form>
    </div>
  );
}
