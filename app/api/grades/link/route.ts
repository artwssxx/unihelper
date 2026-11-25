import { NextResponse } from "next/server";
import { getUser } from "@/lib/server/auth";
import { emisLogout } from "@/lib/server/emis";
import { listLinks, loadLink, removeLink } from "@/lib/server/schoolLink";

// Подключённые для автообновления дневники ученика и их отключение (сессия удаляется, у EMIS — ещё и завершается).
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ links: [] });
  return NextResponse.json({ links: await listLinks(user.id) });
}

export async function DELETE(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const source = new URL(req.url).searchParams.get("source");
  if (source !== "emis" && source !== "emaktab") return NextResponse.json({ error: "invalid" }, { status: 400 });
  const s = await loadLink(user.id, source);
  if (s?.kind === "emis") await emisLogout(s.token);
  await removeLink(user.id, source);
  return NextResponse.json({ ok: true });
}
