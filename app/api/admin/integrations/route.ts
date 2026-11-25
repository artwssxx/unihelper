import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/server/adminAuth";
import { probe, probeAllowed } from "@/lib/server/schoolProbe";

// Админка: проверка связи с eMaktab и EMIS (форма входа, капча, движок). Только разрешённые хосты.
const PRESETS: Record<string, string[]> = {
  emaktab: ["https://login.emaktab.uz/", "https://emaktab.uz/"],
  emis: ["https://emis.edu.uz/", "https://litsey.edu.uz/"],
};

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const raw = sp.get("url");
  let urls: string[];
  if (raw) {
    let u: URL;
    try { u = new URL(raw); } catch { return NextResponse.json({ error: "bad_url" }, { status: 400 }); }
    if (!probeAllowed(u)) return NextResponse.json({ error: "host_not_allowed" }, { status: 400 });
    urls = [u.toString()];
  } else urls = PRESETS[sp.get("target") ?? ""] ?? [...PRESETS.emaktab, ...PRESETS.emis];
  const results = await Promise.all(urls.map((u) => probe(u, sp.get("follow") !== "0")));
  return NextResponse.json({ results });
}
