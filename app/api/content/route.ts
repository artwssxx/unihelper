import { NextResponse } from "next/server";
import { getContent } from "@/lib/server/contentStore";

// Итоговый контент для сайта: значения из кода + правки из админки.
export async function GET() {
  const [programs, events, lessons] = await Promise.all([getContent("programs"), getContent("events"), getContent("lessons")]);
  return NextResponse.json({ programs, events, lessons }, { headers: { "cache-control": "no-store" } });
}
