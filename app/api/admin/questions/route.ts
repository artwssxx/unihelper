import { NextResponse } from "next/server";
import { sectionQuestions } from "@/lib/mocks/engine";
import { isAdmin } from "@/lib/server/adminAuth";

// Просмотр банка вопросов (с ответами) — только для админа.
export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const section = (sp.get("section") ?? "math") as "math" | "rw" | "reading";
  if (!["math", "rw", "reading"].includes(section)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = Number(sp.get("difficulty") ?? 0);
  const q = (sp.get("q") ?? "").toLowerCase().slice(0, 100);
  const all = sectionQuestions(section).filter((x) => (!d || x.difficulty === d) && (!q || `${x.stem} ${x.passage ?? ""} ${x.skill} ${x.domain}`.toLowerCase().includes(q)));
  const page = Math.max(0, Number(sp.get("page") ?? 0));
  return NextResponse.json({ total: all.length, items: all.slice(page * 30, page * 30 + 30) });
}
