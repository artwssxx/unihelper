import { NextResponse } from "next/server";
import { z } from "zod";
import cfg from "@/config/mocks.json";
import { isClosed, markInterrupted } from "@/lib/mocks/attemptStore";
import { writingTasks } from "@/lib/mocks/bank/ieltsWriting";
import { verify } from "@/lib/mocks/token";
import { aiEnabled, evaluateWriting } from "@/lib/server/ai";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { limitsFor } from "@/lib/server/plan";
import { consumeUnlock } from "@/lib/server/coins";

export const maxDuration = 60;

const body = z.object({ token: z.string().max(200_000), task1: z.string().max(8000), task2: z.string().max(12000) });

const words = (s: string) => (s.trim().match(/\S+/g) ?? []).length;

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const st = verify(parsed.data.token);
  if (!st || st.section !== "writing") return NextResponse.json({ error: "bad_token" }, { status: 400 });
  const closed = await isClosed(st.id);
  if (closed) return NextResponse.json({ error: closed }, { status: 409 });
  if (st.deadlineAt && Date.now() > st.deadlineAt + cfg.hardModeGraceSec * 1000 + 60_000) {
    await markInterrupted(st.id, "unload");
    return NextResponse.json({ error: "time_over" }, { status: 409 });
  }
  const { task1, task2 } = parsed.data;
  const { task1: TASK1, task2: TASK2 } = writingTasks(st.qids);
  const counts = { task1: words(task1), task2: words(task2) };
  const base = {
    attemptId: st.id, counts,
    minWords: { task1: TASK1.minWords, task2: TASK2.minWords },
  };
  if (!aiEnabled()) return NextResponse.json({ ...base, ai: false });
  if (!limitsFor(req).writingAi && !(await consumeUnlock(req, "writing_ai"))) return NextResponse.json({ ...base, ai: false, pro: true });
  // Free: до 5 проверок Writing в день на клиента (Pro — больше, когда появится оплата).
  if (!takeQuota(clientKey(req) + ":writing", 5).ok) return NextResponse.json({ ...base, ai: false, limit: true });
  try {
    const [e1, e2] = await Promise.all([
      task1.trim() ? evaluateWriting(1, TASK1.prompt, task1) : null,
      task2.trim() ? evaluateWriting(2, TASK2.prompt, task2) : null,
    ]);
    return NextResponse.json({ ...base, ai: true, task1: e1, task2: e2 });
  } catch (err) {
    console.error("[writing]", err);
    return NextResponse.json({ ...base, ai: false, error: "ai_failed" });
  }
}
