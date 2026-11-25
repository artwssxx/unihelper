import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  if (process.env.VERCEL_ENV === "preview") return new NextResponse(null, { status: 204 });
  if (request.headers.get("sec-fetch-site") !== "same-origin") {
    return new NextResponse(null, { status: 403 });
  }

  const tabId = request.headers.get("x-unihelper-tab");
  if (!tabId || !UUID.test(tabId)) return new NextResponse(null, { status: 400 });

  const db = supabaseAdmin();
  if (!db) return new NextResponse(null, { status: 204 });

  const { error } = await db.rpc("record_site_page_view", { view_tab_id: tabId })
    .abortSignal(AbortSignal.timeout(3000));
  return new NextResponse(null, { status: error ? 503 : 204 });
}
