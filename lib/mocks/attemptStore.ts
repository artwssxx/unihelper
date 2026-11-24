import "server-only";
import { supabaseAdmin } from "@/lib/server/supabase";
import type { AttemptState } from "./token";
import type { MockResult } from "./types";

// Учёт статуса попыток. С Supabase — строго (mock_attempts / attempt_events),
// без базы — память процесса (демо-режим: защищает в пределах одного сервера).
const interrupted = new Set<string>();
const finished = new Set<string>();

export async function recordStart(st: AttemptState, profileId?: string | null) {
  const db = supabaseAdmin();
  if (!db) return;
  const { error } = await db.from("mock_attempts").insert({
    id: st.id, profile_id: profileId ?? null, exam: st.exam, section: st.section, mode: st.mode,
    question_ids: st.qids, started_at: new Date(st.startedAt).toISOString(),
    deadline_at: st.deadlineAt ? new Date(st.deadlineAt).toISOString() : null, status: "in_progress",
  });
  if (error) console.error("[mocks] start", error.message);
}

export async function markInterrupted(id: string, type: string) {
  interrupted.add(id);
  const db = supabaseAdmin();
  if (!db) return;
  await db.from("attempt_events").insert({ attempt_id: id, type, at: new Date().toISOString() });
  await db.from("mock_attempts").update({ status: "interrupted", finished_at: new Date().toISOString() }).eq("id", id).eq("status", "in_progress");
}

export async function isClosed(id: string): Promise<"interrupted" | "completed" | null> {
  if (interrupted.has(id)) return "interrupted";
  if (finished.has(id)) return "completed";
  const db = supabaseAdmin();
  if (!db) return null;
  const { data } = await db.from("mock_attempts").select("status").eq("id", id).maybeSingle();
  return data?.status === "interrupted" || data?.status === "completed" ? data.status : null;
}

export async function recordFinish(st: AttemptState, r: MockResult) {
  finished.add(st.id);
  const db = supabaseAdmin();
  if (!db) return;
  await db.from("mock_attempts").update({
    status: "completed", finished_at: new Date().toISOString(), raw_correct: r.raw.correct,
    module2_path: r.module2Path ?? null, score_low: r.scoreLow ?? null, score_high: r.scoreHigh ?? null, band: r.band ?? null,
  }).eq("id", st.id);
  const rows = st.done.flatMap((m) => m.qids.map((qid) => ({
    attempt_id: st.id, question_id: qid, answer: m.answers[qid] ?? null,
    is_correct: r.review.find((x) => x.id === qid)?.correct ?? false, time_spent_sec: Math.round(m.times[qid] ?? 0),
  })));
  if (rows.length) await db.from("attempt_answers").insert(rows);
}
