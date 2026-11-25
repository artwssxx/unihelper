"use client";

import { useState } from "react";
import { Check, Warn } from "@/components/icons";
import { apiFetch } from "@/lib/auth";
import { update } from "@/lib/clientStore";
import { readFile } from "@/lib/readFile";
import { certificateCheck, type CertCheck, type IeltsScores, type SatScores, type ScoreExam, type ScoreRecord } from "@/lib/scores";

/**
 * Загрузка сертификата IELTS / SAT (PDF, фото, скриншот) с автопроверкой: распознаём баллы и дату,
 * проверяем, официальный ли отчёт, не просрочен ли он и сходятся ли секции. Файл не сохраняется — только баллы.
 */
export default function CertificateUpload({ exam, onScore }: { exam: ScoreExam; onScore: (score: number, official: boolean, date: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [check, setCheck] = useState<(CertCheck & { date: string | null }) | null>(null);

  async function go(file: File) {
    setErr(null);
    setCheck(null);
    if (file.size > 8_000_000) return setErr("Файл больше 8 МБ — сделай скриншот поменьше.");
    setBusy(true);
    try {
      const f = await readFile(file);
      if (f.base64.length > 4_200_000) throw new Error("Файл слишком большой даже после сжатия. Загрузи скриншот поменьше.");
      const r = await apiFetch("/api/scores/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ exam, text: "", file: f }) });
      const j = (await r.json().catch(() => ({}))) as { exam: ScoreExam; kind: "official" | "self"; date: string | null; ielts?: IeltsScores; sat?: SatScores; analysis?: ScoreRecord["analysis"]; message?: string; note?: string };
      if (!r.ok) throw new Error(j.message ?? "Не получилось прочитать сертификат.");
      const c = certificateCheck({ ...j, exam });
      // Картинку читает ИИ; если он не ответил (перегрузка), балла нет не из-за файла.
      if (c.score == null && !j.analysis?.ai) c.notes = ["Распознавание сейчас перегружено и не прочитало файл. Попробуй через минуту или введи балл вручную."];
      setCheck({ ...c, date: j.date });
      if (c.score == null) return;
      onScore(c.score, j.kind === "official" && c.status === "verified", j.date);
      const rec: ScoreRecord = {
        id: Math.random().toString(36).slice(2, 10), exam, date: j.date ?? new Date().toISOString().slice(0, 10), kind: j.kind, source: "file",
        ...(exam === "ielts" ? { ielts: j.ielts } : { sat: j.sat }), ...(j.analysis ? { analysis: j.analysis } : {}),
      };
      update((s) => ({ scores: [...(s.scores ?? []), rec].slice(-40) }));
      if (j.note) setErr(j.note);
    } catch (e) {
      setErr((e as Error).message || "Не получилось прочитать сертификат.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-line p-3">
      <label className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
        <span className="text-sm">
          <b className="block">{exam === "ielts" ? "Загрузить сертификат IELTS (TRF)" : "Загрузить сертификат SAT (College Board)"}</b>
          <span className="text-muted">PDF, фото или скриншот — проверим и подставим балл. Файл не сохраняется.</span>
        </span>
        <span className="btn-secondary flex-none px-4 py-2 text-sm">{busy ? "Проверяем…" : "Выбрать файл"}</span>
        <input type="file" className="sr-only" disabled={busy} accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) go(f); e.target.value = ""; }} />
      </label>
      {check && check.score != null && (
        <div className={`rounded-xl px-3 py-2 text-sm ${check.status === "verified" ? "bg-green-soft text-green" : "bg-orange-soft text-orange-ink-2"}`} role="status">
          <b className="flex items-center gap-1.5">
            {check.status === "verified" ? <Check size={16} /> : <Warn size={16} />}
            {check.status === "verified" ? `Проверено: официальный отчёт, ${exam === "ielts" ? "Overall" : "Total"} ${check.score}` : `Балл ${check.score} подставлен, но есть замечания`}
          </b>
          {check.date && <span className="block text-xs">Дата экзамена: {new Date(check.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>}
          {check.notes.map((n) => <span key={n} className="mt-1 block text-xs">{n}</span>)}
        </div>
      )}
      {check && check.score == null && <p className="text-sm font-semibold text-red">{check.notes[0]}</p>}
      {err && <p className="text-sm font-semibold text-red">{err}</p>}
    </div>
  );
}
