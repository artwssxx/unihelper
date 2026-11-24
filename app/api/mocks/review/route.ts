import { NextResponse } from "next/server";
import { z } from "zod";
import { markInterrupted } from "@/lib/mocks/attemptStore";
import { buildResult } from "@/lib/mocks/engine";
import { verify } from "@/lib/mocks/token";

const body = z.object({
  token: z.string().max(200_000),
  answers: z.record(z.string(), z.string().max(200)),
});

// Разбор прерванной попытки: балл не считается, попытка окончательно закрывается.
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const st = verify(parsed.data.token);
  if (!st || st.section === "writing") return NextResponse.json({ error: "bad_token" }, { status: 400 });
  await markInterrupted(st.id, "unload");
  const answers: Record<string, string> = {};
  for (const id of st.qids) if (parsed.data.answers[id] != null) answers[id] = parsed.data.answers[id];
  const r = buildResult({
    attemptId: st.id, exam: st.exam, section: st.section, mode: st.mode,
    modules: [...st.done, { module: st.module, qids: st.qids, answers, times: {} }],
  });
  return NextResponse.json({ review: r.review });
}
