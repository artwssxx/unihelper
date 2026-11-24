import { NextResponse } from "next/server";
import { z } from "zod";
import { markInterrupted } from "@/lib/mocks/attemptStore";
import { verify } from "@/lib/mocks/token";

const body = z.object({
  token: z.string().max(200_000),
  type: z.enum(["fullscreen_exit", "tab_hidden", "blur", "unload", "copy", "paste"]),
});

// Хард-режим: нарушение правил сразу завершает попытку. Вызывается через navigator.sendBeacon.
export async function POST(req: Request) {
  const raw = await req.text().catch(() => "");
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {}
  const parsed = body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const st = verify(parsed.data.token);
  if (!st || st.mode !== "hard") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await markInterrupted(st.id, parsed.data.type);
  return NextResponse.json({ status: "interrupted" });
}
