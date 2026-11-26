"use client";

import { readFile } from "@/lib/readFile";
import NumberInput from "@/components/NumberInput";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import IeltsTrend from "@/components/IeltsTrend";
import * as I from "@/components/icons";
import { track } from "@/lib/analytics";
import { apiFetch } from "@/lib/auth";
import { update } from "@/lib/clientStore";
import { IELTS_SECTIONS, ieltsOverall, type IeltsScores, type SatScores, type ScoreAnalysis, type ScoreExam, type ScoreRecord } from "@/lib/scores";
import { useContent } from "@/lib/useContent";
import { useProfile } from "@/lib/useProfile";

type Result = { exam: ScoreExam; kind: "official" | "self"; date: string | null; ielts?: IeltsScores; sat?: SatScores; analysis: ScoreAnalysis; note?: string };
const MAX_FILE = 3 * 1024 * 1024;

/** Картинку уменьшаем в браузере: быстрее отправка, меньше трафика. */
export default function ScoreReportPage() {
  const { profile, store } = useProfile();
  const { programs } = useContent();
  const [exam, setExam] = useState<ScoreExam>("ielts");
  const [ielts, setIelts] = useState<IeltsScores>({});
  const [sat, setSat] = useState<SatScores>({});
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [dateTouched, setDateTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Цель — самые высокие требования среди программ в моём списке.
  const target = useMemo(() => {
    const ids = new Set(store?.myPrograms ?? []);
    const list = [...programs, ...(store?.customUnis ?? [])].filter((p) => ids.has(p.id));
    const ie = list.map((p) => p.typical.ielts ?? p.requirements.minIelts).filter((x): x is number => typeof x === "number");
    const sa = list.map((p) => p.typical.sat).filter((x): x is number => typeof x === "number");
    return { ielts: ie.length ? Math.max(...ie) : null, sat: sa.length ? Math.max(...sa) : null };
  }, [programs, store?.myPrograms, store?.customUnis]);

  const scores = store?.scores ?? [];
  const autoOverall = ieltsOverall(ielts);

  async function analyze() {
    setErr(null);
    setRes(null);
    setSaved(false);
    if (file && file.size > MAX_FILE * 2) return setErr("Файл больше 6 МБ. Сожмите его или загрузите скриншот.");
    setBusy(true);
    try {
      const payload = {
        exam,
        text,
        manual: exam === "ielts" ? { ielts: { ...ielts, overall: ielts.overall ?? autoOverall } } : { sat },
        file: file ? await readFile(file) : undefined,
        target,
      };
      if (payload.file && payload.file.base64.length > 4_200_000) throw new Error("Файл слишком большой даже после сжатия. Загрузите скриншот поменьше.");
      const r = await apiFetch("/api/scores/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message ?? "Не получилось разобрать результат.");
      setRes(j);
      // Дату из отчёта подставляем; если её нет — не тащим дату прошлого разбора.
      if (j.date) setDate(j.date);
      else if (!dateTouched) setDate(today);
      track("score_analyze", { exam, source: file ? "file" : text.trim() ? "text" : "manual", ai: j.analysis?.ai ? 1 : 0 });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function save(updateProfile: boolean) {
    if (!res) return;
    const rec: ScoreRecord = {
      id: Math.random().toString(36).slice(2, 10), exam: res.exam, date, kind: res.kind, source: file ? "file" : text.trim() ? "text" : "manual",
      ...(res.exam === "ielts" ? { ielts: res.ielts } : { sat: res.sat }), analysis: res.analysis,
    };
    update((s) => {
      const patch: Partial<typeof s> = { scores: [...(s.scores ?? []), rec].slice(-40) };
      if (updateProfile && s.profile) {
        if (res.exam === "ielts" && res.ielts?.overall != null) patch.profile = { ...s.profile, ielts: res.ielts.overall };
        if (res.exam === "sat" && res.sat?.total != null) patch.profile = { ...s.profile, sat: res.sat.total };
      }
      return patch;
    });
    setSaved(true);
  }

  const main = res ? (res.exam === "ielts" ? res.ielts?.overall : res.sat?.total) : null;

  return (
    <div className="space-y-6">
      <section>
        <Link href="/mocks" className="text-sm font-bold text-primary">← Моки</Link>
        <div className="eyebrow mt-3">МОЙ РЕЗУЛЬТАТ</div>
        <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[40px]" data-i18n-phrase>Разбор результата <span className="serif-accent text-primary">IELTS или SAT</span></h1>
        <p className="mt-2 max-w-[720px] text-body">Загрузи отчёт о результатах (PDF, скриншот или фото), опиши, где терял баллы, или просто впиши баллы. UniHelper сравнит с требованиями твоих вузов и соберёт план по неделям.</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <section className="card space-y-4">
          <div className="flex gap-2" role="radiogroup" aria-label="Экзамен">
            {(["ielts", "sat"] as const).map((e) => (
              <button key={e} role="radio" aria-checked={exam === e} className="chip px-4 py-2" data-on={exam === e} onClick={() => { setExam(e); setRes(null); }}>{e.toUpperCase()}</button>
            ))}
          </div>

          <div>
            <div className="text-sm font-semibold">Файл с результатом (необязательно)</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button className="btn-secondary" onClick={() => fileRef.current?.click()}>{file ? "Заменить файл" : "Выбрать PDF или картинку"}</button>
              {file && (
                <span className="flex items-center gap-2 text-sm">
                  <span className="max-w-[220px] truncate">{file.name}</span>
                  <button className="text-xs font-bold text-red" onClick={() => setFile(null)}>убрать</button>
                </span>
              )}
              <input ref={fileRef} type="file" hidden accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <p className="mt-1.5 text-xs text-muted">Файл отправляется ИИ только для распознавания баллов и не сохраняется. Имя, номер кандидата и дату рождения можно закрыть — они не нужны.</p>
          </div>

          {exam === "ielts" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {IELTS_SECTIONS.map((sct) => (
                <label key={sct.id} className="block text-sm font-semibold">
                  {sct.label}
                  <NumberInput className="input mt-1.5" value={ielts[sct.id]} placeholder="—" onChange={(v) => setIelts({ ...ielts, [sct.id]: v })} />
                </label>
              ))}
              <label className="block text-sm font-semibold">
                Overall
                <NumberInput className="input mt-1.5" value={ielts.overall} placeholder={autoOverall != null ? String(autoOverall) : "—"} onChange={(v) => setIelts({ ...ielts, overall: v })} />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {([["math", "Math"], ["rw", "Reading & Writing"], ["total", "Total"]] as const).map(([k, l]) => (
                <label key={k} className="block text-sm font-semibold">
                  {l}
                  <NumberInput className="input mt-1.5" decimals={false} value={sat[k]} placeholder={k === "total" && sat.math && sat.rw ? String(sat.math + sat.rw) : "—"} onChange={(v) => setSat({ ...sat, [k]: v })} />
                </label>
              ))}
            </div>
          )}

          <label className="block text-sm font-semibold">
            Опиши, как прошло (необязательно)
            <textarea
              className="input mt-1.5 min-h-28 font-normal"
              maxLength={4000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={exam === "ielts" ? "Например: в Reading не успел третий текст, в Writing Task 2 написал 230 слов, путаюсь в True/False/Not Given…" : "Например: в Math не успел второй модуль, ошибки в процентах и квадратичных функциях…"}
            />
          </label>
          <label className="block text-sm font-semibold">
            Дата экзамена
            <input className="input mt-1.5 block max-w-[220px]" type="date" value={date} max={today} onChange={(e) => { setDate(e.target.value); setDateTouched(true); }} />
          </label>
          {(target.ielts || target.sat) && (
            <p className="text-xs text-muted">Сравним с целью из твоего списка вузов: {exam === "ielts" ? (target.ielts ? `IELTS ${target.ielts}` : "нет данных") : target.sat ? `SAT ${target.sat}` : "нет данных"}.</p>
          )}
          {err && <p className="text-sm font-semibold text-red">{err}</p>}
          <button className="btn-primary w-full" disabled={busy} onClick={analyze}>{busy ? "Разбираем… до 30 секунд" : "Разобрать"}</button>
        </section>

        <section className="space-y-4">
          {res ? (
            <div className="card space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill bg-primary-soft text-primary-ink">{res.exam.toUpperCase()}</span>
                <span className={`pill ${res.kind === "official" ? "bg-green-soft text-green" : "bg-line-3 text-muted"}`}>{res.kind === "official" ? "официальный отчёт" : "со слов / вручную"}</span>
                <span className="pill bg-line-3 text-muted">{res.analysis.ai ? "разбор ИИ" : "разбор по правилам"}</span>
              </div>
              {main != null && <div className="text-[44px] font-extrabold leading-none tracking-tight">{main}</div>}
              <div className="flex flex-wrap gap-2 text-sm">
                {res.exam === "ielts"
                  ? IELTS_SECTIONS.filter((x) => res.ielts?.[x.id] != null).map((x) => <span key={x.id} className="pill bg-line-3 text-body">{x.label} {res.ielts![x.id]}</span>)
                  : ([["math", "Math"], ["rw", "RW"]] as const).filter(([k]) => res.sat?.[k] != null).map(([k, l]) => <span key={k} className="pill bg-line-3 text-body">{l} {res.sat![k]}</span>)}
              </div>
              {res.note && <p className="rounded-xl bg-orange-soft px-3 py-2 text-sm text-orange-ink-2">{res.note}</p>}
              <p className="text-body">{res.analysis.summary}</p>
              {res.analysis.strengths.length > 0 && <List title="Сильные стороны" items={res.analysis.strengths} tone="green" />}
              {res.analysis.weaknesses.length > 0 && <List title="Где теряешь баллы" items={res.analysis.weaknesses} tone="orange" />}
              <div>
                <div className="text-xs font-extrabold tracking-[0.14em] text-muted">ПЛАН</div>
                <ol className="mt-2 space-y-3">
                  {res.analysis.plan.map((p, i) => (
                    <li key={i} className="rounded-xl border border-line p-3">
                      <div className="flex items-center justify-between gap-2 font-extrabold"><span>{p.title}</span><span className="text-xs font-bold text-muted">{p.weeks} нед.</span></div>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-body">{p.actions.map((a, j) => <li key={j}>{a}</li>)}</ul>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm text-primary-ink">{res.analysis.targetNote}</p>
              {saved ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-green"><I.Check size={16} /> Сохранено — смотри динамику ниже.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary" onClick={() => save(false)}>Сохранить в мои результаты</button>
                  {profile && main != null && (
                    <button className="btn-primary" onClick={() => save(true)}>Сохранить и обновить профиль: {res.exam.toUpperCase()} {main}</button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-body">
              <div className="font-extrabold">Что получишь</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                <li>Баллы по секциям — даже из фото отчёта</li>
                <li>Где теряешь баллы и что подтянуть первым</li>
                <li>Сравнение с требованиями вузов из твоего списка</li>
                <li>План на 4–12 недель с моками и уроками</li>
              </ul>
            </div>
          )}

          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-xl font-extrabold">Динамика IELTS</h2>
              <span className="pill bg-bg text-muted">моки + твои результаты</span>
            </div>
            <IeltsTrend mocks={store?.mocks ?? []} scores={scores} />
          </div>

          {scores.length > 0 && (
            <div className="card space-y-2">
              <h2 className="m-0 text-lg font-extrabold">Мои результаты</h2>
              <ul className="divide-y divide-line-3 text-sm">
                {[...scores].reverse().map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      <b>{s.exam.toUpperCase()} {s.exam === "ielts" ? s.ielts?.overall ?? "—" : s.sat?.total ?? "—"}</b>
                      <span className="ml-2 text-xs text-muted">{new Date(s.date).toLocaleDateString("ru-RU")} · {s.kind === "official" ? "официальный" : "со слов"}</span>
                    </span>
                    <button className="text-xs font-bold text-muted hover:text-red" onClick={() => update((st) => ({ scores: (st.scores ?? []).filter((x) => x.id !== s.id) }))}>удалить</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: "green" | "orange" }) {
  return (
    <div>
      <div className="text-xs font-extrabold tracking-[0.14em] text-muted">{title.toUpperCase()}</div>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${tone === "green" ? "bg-green" : "bg-orange"}`} />
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}
