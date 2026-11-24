import { NextResponse } from "next/server";
import { buildDemo } from "@/lib/demoData";

// Данные демо для инвесторов (вымышленный ученик). Ответы моков — уже после «завершения», поэтому разбор можно отдавать.
export async function GET() {
  return NextResponse.json(buildDemo(), { headers: { "cache-control": "no-store" } });
}
