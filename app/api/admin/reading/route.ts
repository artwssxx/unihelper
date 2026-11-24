import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/server/adminAuth";
import { generateQuestions, generateText, saveTest, verifyQuestions, type PassageDraft, type RawQuestions } from "@/lib/server/readingPool";
import { supabaseAdmin } from "@/lib/server/supabase";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ items: null });
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const { data } = await db.from("mock_reading_tests").select("*").eq("id", id).maybeSingle();
    return NextResponse.json({ test: data });
  }
  const { data } = await db.from("mock_reading_tests").select("id,title,status,source,created_at,questions,checks").order("created_at", { ascending: false }).limit(100);
  return NextResponse.json({
    items: (data ?? []).map((t) => ({ id: t.id, title: t.title, status: t.status, source: t.source, created_at: t.created_at, count: (t.questions as unknown[]).length, checks: t.checks })),
  });
}

const draft = z.object({
  title: z.string().min(3).max(200),
  text: z.string().min(1500).max(12000),
  questions: z.array(z.object({ kind: z.enum(["tfng", "mcq", "completion"]), stem: z.string().max(600), choices: z.array(z.string().max(300)).optional(), answer: z.string().max(60) })).max(20),
  checks: z.object({ generated: z.number(), kept: z.number(), dropped: z.array(z.string()) }),
});
const n = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const rawQ = z.object({ tfng: z.array(z.any()).max(10), mcq: z.array(z.any()).max(10), completion: z.array(z.any()).max(10) });
const body = z.union([
  z.object({ action: z.literal("text"), n, avoid: z.array(z.string().max(200)).max(10).default([]) }),
  z.object({ action: z.literal("questions"), n, text: z.string().min(1500).max(12000) }),
  z.object({ action: z.literal("verify"), title: z.string().max(200), text: z.string().min(1500).max(12000), raw: rawQ, dropped: z.array(z.string()).max(40), generated: z.number() }),
  z.object({ action: z.literal("save"), drafts: z.array(draft).length(3) }),
  z.object({ action: z.literal("status"), id: z.string().regex(/^[a-z0-9]{6,16}$/), status: z.enum(["auto", "verified", "rejected"]) }),
]);

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;
  if (d.action === "text" || d.action === "questions" || d.action === "verify") {
    try {
      if (d.action === "text") return NextResponse.json(await generateText(d.n, d.avoid));
      if (d.action === "questions") return NextResponse.json(await generateQuestions(d.n, d.text));
      return NextResponse.json({ draft: await verifyQuestions(d.title, d.text, d.raw as RawQuestions, { dropped: d.dropped, generated: d.generated }) });
    } catch (e) {
      console.error("[reading gen]", d.action, (e as Error).message);
      const busy = /503|недоступны|overload/i.test((e as Error).message);
      return NextResponse.json({ error: "ai_failed", message: busy ? "Gemini сейчас перегружен. Попробуйте через пару минут." : "ИИ не справился за отведённое время. Нажмите «Ещё раз»." }, { status: 502 });
    }
  }
  if (d.action === "save") {
    const r = await saveTest(d.drafts as PassageDraft[]);
    return r.ok ? NextResponse.json(r) : NextResponse.json({ error: "invalid", message: r.error }, { status: 422 });
  }
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "no_database" }, { status: 503 });
  await db.from("mock_reading_tests").update({ status: d.status, reviewed_at: new Date().toISOString() }).eq("id", d.id);
  return NextResponse.json({ ok: true });
}
