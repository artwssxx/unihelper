import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { analyzeScore } from "@/lib/server/scoreReport";

export const maxDuration = 60;

const band = z.number().min(0).max(9).nullable().optional();
const sat = z.number().min(200).max(1600).nullable().optional();
const body = z.object({
  exam: z.enum(["ielts", "sat"]),
  text: z.string().max(4000).default(""),
  manual: z.object({
    ielts: z.object({ listening: band, reading: band, writing: band, speaking: band, overall: band }).optional(),
    sat: z.object({ math: sat, rw: sat, total: sat }).optional(),
  }).optional(),
  // ~3 МБ файла в base64; сам файл нигде не сохраняется.
  file: z.object({ mime: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]), base64: z.string().max(4_200_000) }).optional(),
  target: z.object({ ielts: z.number().nullable().optional(), sat: z.number().nullable().optional() }).optional(),
});

export async function POST(req: Request) {
  if (!takeQuota(clientKey(req) + ":score", 15).ok) return NextResponse.json({ error: "rate_limited", message: "Сегодня разборов уже много. Попробуйте завтра." }, { status: 429 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid", message: "Проверьте файл (PDF или картинка до 3 МБ) и баллы." }, { status: 400 });
  const d = p.data;
  if (!d.text.trim() && !d.file && !d.manual) return NextResponse.json({ error: "empty", message: "Загрузите файл, опишите результат или введите баллы." }, { status: 400 });
  return NextResponse.json(await analyzeScore(d));
}
