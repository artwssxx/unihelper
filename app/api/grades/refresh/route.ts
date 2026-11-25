import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/server/auth";
import { emaktabCollect } from "@/lib/server/emaktab";
import { emisCollect } from "@/lib/server/emis";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { langOf } from "@/lib/server/replyLang";
import { loadLink, removeLink, touchLink } from "@/lib/server/schoolLink";

export const maxDuration = 60;

// Автообновление дневника по сохранённой сессии (без пароля). Сессия кончилась — удаляем её и просим войти снова.
const body = z.object({ source: z.enum(["emis", "emaktab"]) });

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ status: "error", message: "Войди в аккаунт." }, { status: 401 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ status: "error", message: "invalid" }, { status: 400 });
  if (!takeQuota(clientKey(req, user.id) + ":grades-refresh", 40).ok) return NextResponse.json({ status: "error", message: "Сегодня обновлений уже много. Попробуй завтра." }, { status: 429 });
  const source = p.data.source;
  const s = await loadLink(user.id, source);
  if (!s) return NextResponse.json({ status: "expired" });
  const r = s.kind === "emis" ? await emisCollect(s.token, langOf(req)) : await emaktabCollect(s.jar);
  if (r.status === "expired") {
    await removeLink(user.id, source);
    return NextResponse.json({ status: "expired" });
  }
  // eMaktab по ходу выдаёт новые служебные cookie — храним только долгие cookie входа.
  if (r.status === "ok") await touchLink(user.id, source, s.kind === "emaktab" ? { kind: "emaktab", jar: Object.fromEntries(Object.entries(s.jar).filter(([k]) => /^UZDnevnikAuth_/i.test(k))) } : s);
  return NextResponse.json({ ...r, remembered: true });
}
