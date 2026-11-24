import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/server/adminAuth";
import { botStatus, sendDigests, setupBot } from "@/lib/server/tgBot";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ...(await botStatus()), cron: Boolean(process.env.CRON_SECRET) });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (action === "setup") return NextResponse.json(await setupBot());
  if (action === "digest") return NextResponse.json(await sendDigests(50));
  return NextResponse.json({ error: "invalid" }, { status: 400 });
}
