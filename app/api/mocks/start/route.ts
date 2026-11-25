import { randomUUID, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import cfg from "@/config/mocks.json";
import { recordStart } from "@/lib/mocks/attemptStore";
import { PASSAGES } from "@/lib/mocks/bank/ieltsReading";
import { pickWritingIds, writingTasks } from "@/lib/mocks/bank/ieltsWriting";
import { isMobileUA } from "@/lib/mocks/device";
import { buildReadingTest, buildSatModule1, getQuestion, toPublic } from "@/lib/mocks/engine";
import { sign, type AttemptState } from "@/lib/mocks/token";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { pickPoolTest } from "@/lib/server/readingPool";
import { limitsFor } from "@/lib/server/plan";
import { hasUnlockFromRequest, consumeUnlock } from "@/lib/server/coins";

const body = z.object({
  exam: z.enum(["sat", "ielts"]),
  section: z.enum(["math", "rw", "reading", "writing"]),
  mode: z.enum(["light", "hard"]),
  seen: z.array(z.string().max(40)).max(3000).optional(),
  device: z.object({ telegram: z.boolean(), coarse: z.boolean() }).optional(),
  profileId: z.string().max(64).nullish(),
});

const rand = () => randomInt(0, 1_000_000) / 1_000_000;

export async function POST(req: Request) {
  if (!takeQuota(clientKey(req) + ":mockstart", 60).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { exam, section, mode, seen, device, profileId } = parsed.data;
  if ((exam === "sat") !== (section === "math" || section === "rw")) return NextResponse.json({ error: "invalid" }, { status: 400 });

  // Тариф: хард-режим и IELTS Writing — в Pro.
  const limits = limitsFor(req);
  // Без Pro — можно открыть за UniCoins (купленное открытие тратится здесь).
  if (section === "writing" && !limits.writingAi && !(await hasUnlockFromRequest(req, "writing_ai"))) {
    return NextResponse.json({ error: "pro_required", coins: "writing_ai" }, { status: 402 });
  }

  // Хард-режим: только браузер на компьютере, вне Telegram (на телефоне уведомления дают ложные срабатывания).
  if (mode === "hard" && (isMobileUA(req.headers.get("user-agent") ?? "") || device?.telegram || device?.coarse)) {
    return NextResponse.json({ error: "hard_desktop_only" }, { status: 403 });
  }
  if (mode === "hard" && !limits.hardMode && !(await consumeUnlock(req, "hard_mock"))) {
    return NextResponse.json({ error: "pro_required", coins: "hard_mock" }, { status: 402 });
  }

  const now = Date.now();
  let qids: string[] = [];
  let minutes: number;
  let totalModules = 1;
  let passages = section === "reading" ? PASSAGES : undefined;
  if (exam === "sat") {
    const spec = cfg.sat[section as "math" | "rw"];
    qids = buildSatModule1(section as "math" | "rw", new Set(seen ?? []), rand);
    minutes = spec.minutesPerModule;
    totalModules = spec.modules;
  } else if (section === "reading") {
    // Сначала — новый тест из пула (ИИ + проверка), которого ученик ещё не видел; иначе — тест из банка.
    const pool = await pickPoolTest(new Set(seen ?? [])).catch(() => null);
    if (pool) {
      qids = pool.questions.map((q) => q.id);
      passages = pool.passages;
    } else qids = buildReadingTest(rand);
    minutes = cfg.ielts.reading.minutes;
  } else {
    // Writing: новая диаграмма Task 1 и тема Task 2, которой ещё не было у ученика.
    qids = pickWritingIds(rand, new Set(seen ?? []));
    minutes = cfg.ielts.writing.minutes;
  }

  const st: AttemptState = {
    v: 1, id: randomUUID(), exam, section, mode, module: 1, totalModules, qids,
    startedAt: now, deadlineAt: mode === "hard" ? now + minutes * 60_000 : null, done: [],
  };
  await recordStart(st, profileId);

  return NextResponse.json({
    token: sign(st),
    attemptId: st.id,
    module: 1,
    totalModules,
    durationSec: minutes * 60,
    deadlineAt: st.deadlineAt,
    serverNow: now,
    questions: section === "writing" ? [] : qids.map((id) => toPublic(getQuestion(id)!)),
    passages,
    writing: section === "writing" ? writingTasks(qids) : undefined,
    taskIds: section === "writing" ? qids : undefined,
  });
}
