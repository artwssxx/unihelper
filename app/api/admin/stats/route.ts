import { NextResponse } from "next/server";
import { sectionQuestions } from "@/lib/mocks/engine";
import { isAdmin } from "@/lib/server/adminAuth";
import { listForAdmin, storageMode } from "@/lib/server/contentStore";
import { llm } from "@/lib/server/llm";
import { supabaseAdmin } from "@/lib/server/supabase";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [programs, events, lessons] = await Promise.all([listForAdmin("programs"), listForAdmin("events"), listForAdmin("lessons")]);
  const count = (xs: { source: string }[]) => ({ total: xs.filter((x) => x.source !== "deleted").length, edited: xs.filter((x) => x.source === "edited" || x.source === "added").length });
  const bank = Object.fromEntries((["math", "rw", "reading"] as const).map((s) => {
    const qs = sectionQuestions(s);
    return [s, { total: qs.length, d1: qs.filter((q) => q.difficulty === 1).length, d2: qs.filter((q) => q.difficulty === 2).length, d3: qs.filter((q) => q.difficulty === 3).length }];
  }));
  const db = supabaseAdmin();
  let leads: { id: string; program_id: string; full_name: string; phone: string; status: string; created_at: string }[] | null = null;
  let mockAttempts: number | null = null;
  if (db) {
    const l = await db.from("leads").select("id,program_id,full_name,phone,status,created_at").order("created_at", { ascending: false }).limit(50);
    leads = l.data ?? [];
    const m = await db.from("mock_attempts").select("id", { count: "exact", head: true });
    mockAttempts = m.count ?? 0;
  }
  return NextResponse.json({
    storage: storageMode(),
    ai: llm()?.name ?? null,
    database: Boolean(db),
    content: { programs: count(programs), events: count(events), lessons: count(lessons) },
    unverifiedPrograms: programs.filter((p) => p.data && !(p.data as { verifiedAt?: string | null }).verifiedAt).length,
    bank,
    leads,
    mockAttempts,
  });
}
