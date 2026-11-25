import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/server/auth";
import { importEmaktab } from "@/lib/server/emaktab";
import { gradesFromFile } from "@/lib/server/gradesPhoto";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";

export const maxDuration = 60;

// Импорт оценок: eMaktab (логин и пароль ученика — только для одного входа, не сохраняются и не пишутся в логи)
// или фото/скриншот/PDF табеля (файл не сохраняется). Только для вошедших.
const body = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("emaktab"),
    login: z.string().trim().min(2).max(80),
    password: z.string().min(1).max(128),
    captcha: z.object({ answer: z.string().trim().min(1).max(20), state: z.string().max(20_000) }).optional(),
  }),
  z.object({
    source: z.literal("file"),
    file: z.object({ mime: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]), base64: z.string().max(4_200_000) }),
  }),
]);

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ status: "error", message: "Войди в аккаунт, чтобы загрузить оценки." }, { status: 401 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ status: "error", message: "Проверь данные: логин и пароль eMaktab или файл (PDF или картинка до 3 МБ)." }, { status: 400 });
  const d = p.data;
  if (d.source === "emaktab") {
    // Капча — это продолжение той же попытки, её не считаем отдельно.
    if (!d.captcha && !takeQuota(clientKey(req, user.id) + ":emaktab", 12).ok)
      return NextResponse.json({ status: "error", message: "Сегодня попыток входа в eMaktab уже много. Попробуй завтра, чтобы eMaktab не заблокировал аккаунт." }, { status: 429 });
    return NextResponse.json(await importEmaktab(d.login, d.password, d.captcha));
  }
  if (!takeQuota(clientKey(req, user.id) + ":gradesfile", 15).ok)
    return NextResponse.json({ status: "error", message: "Сегодня распознаваний уже много. Попробуй завтра или введи оценки вручную." }, { status: 429 });
  return NextResponse.json(await gradesFromFile(d.file));
}
