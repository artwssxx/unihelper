import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/server/auth";
import { importEmaktab } from "@/lib/server/emaktab";
import { importEmis } from "@/lib/server/emis";
import { saveLink } from "@/lib/server/schoolLink";
import { langOf } from "@/lib/server/replyLang";
import { gradesFromFile } from "@/lib/server/gradesPhoto";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";

export const maxDuration = 60;

// Импорт оценок: eMaktab (школы) или EMIS (лицеи) по логину и паролю ученика — только для одного входа,
// не сохраняются и не пишутся в логи; или фото/скриншот/PDF табеля (файл не сохраняется). Только для вошедших.
const body = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("emaktab"),
    login: z.string().trim().min(2).max(80),
    password: z.string().min(1).max(128),
    captcha: z.object({ answer: z.string().trim().min(1).max(20), state: z.string().max(20_000) }).optional(),
    remember: z.boolean().optional(),
  }),
  z.object({
    source: z.literal("emis"),
    login: z.string().trim().min(2).max(80),
    password: z.string().min(1).max(128),
    remember: z.boolean().optional(),
  }),
  z.object({
    source: z.literal("file"),
    file: z.object({ mime: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]), base64: z.string().max(4_200_000) }),
  }),
]);

export async function POST(req: Request) {
  const user = await getUser(req);
  const p = body.safeParse(await req.json().catch(() => null));
  // Вход через eMaktab/EMIS доступен и до регистрации — чтобы заполнить анкету (данные остаются в браузере ученика).
  if (!user && (!p.success || p.data.source === "file")) return NextResponse.json({ status: "error", message: "Войди в аккаунт, чтобы загрузить оценки." }, { status: 401 });
  if (!user && !takeQuota(clientKey(req) + ":school-anon", 8).ok)
    return NextResponse.json({ status: "error", message: "Сегодня попыток входа уже много. Попробуй завтра." }, { status: 429 });
  const who = user ? clientKey(req, user.id) : clientKey(req);
  if (!p.success) return NextResponse.json({ status: "error", message: "Проверь данные: логин и пароль eMaktab или файл (PDF или картинка до 3 МБ)." }, { status: 400 });
  const d = p.data;
  if (d.source === "emaktab") {
    // Капча — это продолжение той же попытки, её не считаем отдельно.
    if (!d.captcha && !takeQuota(who + ":emaktab", 12).ok)
      return NextResponse.json({ status: "error", message: "Сегодня попыток входа в eMaktab уже много. Попробуй завтра, чтобы eMaktab не заблокировал аккаунт." }, { status: 429 });
    // Автообновление — только вошедшим и только с согласия: храним зашифрованные cookie сессии, не пароль.
    const keep = Boolean(user && d.remember);
    const { jar, ...r } = await importEmaktab(d.login, d.password, d.captcha, { keep });
    const remembered = Boolean(user && jar && r.status === "ok" && (await saveLink(user.id, "emaktab", { kind: "emaktab", jar })));
    return NextResponse.json({ ...r, remembered });
  }
  if (d.source === "emis") {
    if (!takeQuota(who + ":emis", 12).ok)
      return NextResponse.json({ status: "error", message: "Сегодня попыток входа в EMIS уже много. Попробуй завтра." }, { status: 429 });
    const keep = Boolean(user && d.remember);
    const { token, ...r } = await importEmis(d.login, d.password, langOf(req), { keep });
    const remembered = Boolean(user && token && r.status === "ok" && (await saveLink(user.id, "emis", { kind: "emis", token })));
    return NextResponse.json({ ...r, remembered });
  }
  if (!takeQuota(who + ":gradesfile", 15).ok)
    return NextResponse.json({ status: "error", message: "Сегодня распознаваний уже много. Попробуй завтра или введи оценки вручную." }, { status: 429 });
  return NextResponse.json(await gradesFromFile(d.file));
}
