import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendDigests } from "@/lib/server/tgBot";

export const maxDuration = 60;

// Еженедельный дайджест в Telegram. Vercel Cron присылает Authorization: Bearer <CRON_SECRET>.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await sendDigests());
}
