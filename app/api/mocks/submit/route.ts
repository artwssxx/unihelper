import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import cfg from "@/config/mocks.json";
import { isClosed, recordFinish } from "@/lib/mocks/attemptStore";
import { buildResult, buildSatModule2, getQuestion, gradeIds, module2Path, toPublic } from "@/lib/mocks/engine";
import { sign, verify } from "@/lib/mocks/token";
import { ensurePoolQuestions } from "@/lib/server/readingPool";

const body = z.object({
  token: z.string().max(200_000),
  answers: z.record(z.string(), z.string().max(200)),
  times: z.record(z.string(), z.number().min(0).max(36_000)).default({}),
  seen: z.array(z.string().max(40)).max(3000).optional(),
});

const rand = () => randomInt(0, 1_000_000) / 1_000_000;

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const st = verify(parsed.data.token);
  if (!st || st.section === "writing") return NextResponse.json({ error: "bad_token" }, { status: 400 });

  const closed = await isClosed(st.id);
  if (closed === "interrupted") return NextResponse.json({ error: "interrupted" }, { status: 409 });
  if (closed === "completed") return NextResponse.json({ error: "already_finished" }, { status: 409 });

  // Принимаем ответы только на вопросы этого модуля.
  const answers: Record<string, string> = {};
  const times: Record<string, number> = {};
  for (const id of st.qids) {
    if (parsed.data.answers[id] != null) answers[id] = parsed.data.answers[id];
    if (parsed.data.times[id] != null) times[id] = parsed.data.times[id];
  }
  await ensurePoolQuestions([...st.done.flatMap((m) => m.qids), ...st.qids]);
  const late = st.deadlineAt != null && Date.now() > st.deadlineAt + cfg.hardModeGraceSec * 1000;
  const done = [...st.done, { module: st.module, qids: st.qids, answers, times }];

  // SAT: после модуля 1 сервер собирает модуль 2 — лёгкую или сложную ветку.
  if (st.exam === "sat" && st.module < st.totalModules) {
    const section = st.section as "math" | "rw";
    const path = module2Path(gradeIds(st.qids, answers).fraction);
    const m2 = buildSatModule2(section, path, new Set(st.qids), new Set(parsed.data.seen ?? []), rand);
    const minutes = cfg.sat[section].minutesPerModule;
    const now = Date.now();
    const next = { ...st, module: st.module + 1, qids: m2, done, path, deadlineAt: st.mode === "hard" ? now + minutes * 60_000 : null };
    return NextResponse.json({
      next: {
        token: sign(next), module: next.module, totalModules: st.totalModules, durationSec: minutes * 60,
        deadlineAt: next.deadlineAt, serverNow: now, questions: m2.map((id) => toPublic(getQuestion(id)!)),
      },
      late,
    });
  }

  const result = buildResult({ attemptId: st.id, exam: st.exam, section: st.section, mode: st.mode, modules: done, path: st.path });
  await recordFinish({ ...st, done }, result);
  return NextResponse.json({ result, late });
}
