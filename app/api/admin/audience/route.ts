import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/server/adminAuth";
import { registeredUsers, visitorsLast30Days } from "@/lib/server/audience";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [users, visitors] = await Promise.all([registeredUsers(), visitorsLast30Days()]);
  return NextResponse.json({ users, visitors }, { headers: { "Cache-Control": "private, no-store" } });
}
