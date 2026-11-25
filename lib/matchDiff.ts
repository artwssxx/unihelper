// Что изменилось в подборе с прошлого раза: какие вузы поднялись или опустились по оценке поступления
// после изменения профиля (оценки, IELTS, страны…). Чистый расчёт — для плашки «Подбор обновился».

import type { FitLabel } from "./types";

export type MatchSnap = { at: string; labels: Record<string, FitLabel> };
export type MatchChange = { id: string; university: string; from: FitLabel; to: FitLabel };

const RANK: Record<FitLabel, number> = { not_eligible: 0, ambitious: 1, realistic: 2, high: 3 };

export function snapOf(items: { program: { id: string }; fit: { admission: { label: FitLabel } } }[], now = new Date()): MatchSnap {
  return { at: now.toISOString(), labels: Object.fromEntries(items.map((i) => [i.program.id, i.fit.admission.label])) };
}

/** Изменения меток с прошлого снимка: только вузы, которые были в обоих (новые вузы — отдельно). */
export function diffMatch(prev: MatchSnap | undefined, items: { program: { id: string; university: string }; fit: { admission: { label: FitLabel } } }[]) {
  if (!prev) return { up: [] as MatchChange[], down: [] as MatchChange[], added: 0 };
  const up: MatchChange[] = [], down: MatchChange[] = [];
  let added = 0;
  for (const i of items) {
    const from = prev.labels[i.program.id];
    const to = i.fit.admission.label;
    if (!from) { added++; continue; }
    if (RANK[to] > RANK[from]) up.push({ id: i.program.id, university: i.program.university, from, to });
    else if (RANK[to] < RANK[from]) down.push({ id: i.program.id, university: i.program.university, from, to });
  }
  return { up, down, added };
}

/** Снимок стоит обновить, если метки изменились. */
export function snapChanged(prev: MatchSnap | undefined, next: MatchSnap): boolean {
  if (!prev) return true;
  const a = Object.keys(prev.labels), b = Object.keys(next.labels);
  return a.length !== b.length || b.some((k) => prev.labels[k] !== next.labels[k]);
}
