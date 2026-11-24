import { NextResponse } from "next/server";
import { blockedSet, communityCtx, isResponse, PROFILE_COLS, toPublic } from "@/lib/server/community";

// Каталог участников: только те, кто включил «показывать меня в поиске».
// Поиск по имени, городу, навыкам, «кого ищу» и описанию — без учёта регистра.
export async function GET(req: Request) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 60);
  const major = (url.searchParams.get("major") ?? "").trim().slice(0, 40);
  let query = c.db.from("community_profiles").select(PROFILE_COLS).eq("visible", true).eq("hidden_by_admin", false).order("updated_at", { ascending: false }).limit(300);
  if (major) query = query.eq("major", major);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  const blocked = await blockedSet(c.db, c.user.id);
  const words = q.split(/\s+/).filter(Boolean);
  const items = (data ?? [])
    .filter((r) => !blocked.has(r.user_id))
    .filter((r) => {
      if (!words.length) return true;
      const hay = [r.display_name, r.city, r.bio, r.looking_for, ...(r.skills ?? [])].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .slice(0, 60)
    .map((r) => ({ ...toPublic(r), me: r.user_id === c.user.id }));
  return NextResponse.json({ items });
}
