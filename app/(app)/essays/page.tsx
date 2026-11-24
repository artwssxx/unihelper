"use client";

import { useState } from "react";
import { update, useStore } from "@/lib/clientStore";
import type { EssayFeedback } from "@/lib/essayRules";

const PROMPTS = [
  "Личное эссе (Common App): расскажите историю, без которой ваша заявка была бы неполной.",
  "GKS: мотивационное письмо — почему Корея, эта специальность и ваш план после учёбы.",
  "Türkiye Bursları: почему вы хотите учиться в Турции и как это связано с вашими целями.",
  "Своя тема",
];
const LABELS: Record<keyof EssayFeedback["scores"], string> = { structure: "Структура", voice: "Личный голос", specificity: "Конкретика", language: "Язык" };

export default function EssaysPage() {
  const store = useStore();
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [custom, setCustom] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState<(EssayFeedback & { limited?: boolean }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const words = (text.match(/\S+/g) ?? []).length;
  const versions = [...(store?.essays ?? [])].reverse();

  async function check() {
    setBusy(true);
    setError(null);
    const p = prompt === "Своя тема" ? custom : prompt;
    try {
      const res = await fetch("/api/ai/essay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: p, text }) });
      if (!res.ok) throw new Error();
      const j = (await res.json()) as EssayFeedback;
      setFb(j);
      const avg = (j.scores.structure + j.scores.voice + j.scores.specificity + j.scores.language) / 4;
      update((s) => ({
        essays: [...(s.essays ?? []), { id: crypto.randomUUID(), prompt: p, text, at: new Date().toISOString(), feedback: j }].slice(-20),
        // Эссе оценено → ось «Эссе» в Profile Strength перестаёт быть «не оценено».
        profile: s.profile ? { ...s.profile, essays: avg >= 8 ? "strong" : avg >= 6 ? "ok" : "weak" } : s.profile,
      }));
    } catch {
      setError("Не удалось проверить. Текст должен быть не короче 50 символов.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="eyebrow">ЭССЕ</div>
        <h1 className="mt-3 text-[34px] font-extrabold tracking-tight sm:text-[42px]">Проверка эссе</h1>
        <p className="mt-2 max-w-[680px] text-body">ИИ оценивает структуру, личный голос, конкретику и язык, находит клише и задаёт вопросы. Но не пишет текст за тебя — это должен быть твой голос.</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="card space-y-4">
          <label className="block text-sm font-semibold">
            Тема
            <select className="input mt-1.5" value={prompt} onChange={(e) => setPrompt(e.target.value)}>
              {PROMPTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          {prompt === "Своя тема" && <input className="input" aria-label="Своя тема" placeholder="Вставьте тему эссе" value={custom} onChange={(e) => setCustom(e.target.value)} />}
          <label className="block text-sm font-semibold">
            Текст
            <textarea className="input mt-1.5 min-h-[340px] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} placeholder="Вставьте черновик эссе" />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted">{words} слов</span>
            <button className="btn-primary" onClick={check} disabled={busy || text.trim().length < 50}>{busy ? "Проверяем…" : "Проверить эссе"}</button>
          </div>
          {error && <p className="text-sm text-red">{error}</p>}
        </section>

        <section className="space-y-4">
          {!fb ? (
            <div className="card text-sm text-muted">Результат проверки появится здесь. Free — 3 ИИ-проверки, Pro — 30 в месяц.</div>
          ) : (
            <>
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="m-0 text-xl font-extrabold">Оценка</h2>
                  <span className="pill bg-bg text-muted">{fb.source === "ai" ? "ИИ" : "по правилам"}</span>
                </div>
                {fb.limited && <p className="text-xs text-orange-ink">Лимит ИИ-проверок исчерпан — показана проверка по правилам.</p>}
                {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => (
                  <div key={k}>
                    <div className="flex justify-between text-sm font-semibold"><span>{LABELS[k]}</span><span>{fb.scores[k]}/10</span></div>
                    <div className="mt-1.5 h-[7px] rounded-full bg-line"><div className="h-[7px] rounded-full bg-primary" style={{ width: `${fb.scores[k] * 10}%` }} /></div>
                  </div>
                ))}
                <p className="text-sm leading-relaxed text-body">{fb.summary}</p>
              </div>
              <div className="card">
                <h3 className="m-0 font-extrabold">Клише</h3>
                {fb.cliches.length === 0 ? <p className="mt-2 text-sm text-muted">Не найдено.</p> : (
                  <ul className="mt-3 space-y-2">
                    {fb.cliches.map((c, i) => <li key={i} className="rounded-xl bg-orange-soft px-3 py-2 text-sm"><b>{c.phrase}</b> — «{c.quote}»</li>)}
                  </ul>
                )}
              </div>
              <div className="card">
                <h3 className="m-0 font-extrabold">Вопросы, чтобы углубить текст</h3>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px]">{fb.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
              </div>
            </>
          )}
        </section>
      </div>

      {versions.length > 0 && (
        <section className="card">
          <h2 className="m-0 text-xl font-extrabold">Версии</h2>
          <ul className="mt-3 divide-y divide-line-3">
            {versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{v.prompt}</span>
                <span className="text-muted">{new Date(v.at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <button className="font-bold text-primary" onClick={() => { setText(v.text); setFb(v.feedback as EssayFeedback); }}>Открыть</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
