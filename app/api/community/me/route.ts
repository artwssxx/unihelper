import { NextResponse } from "next/server";
import { z } from "zod";
import { cleanList } from "@/lib/community";
import { communityCtx, isResponse, PROFILE_COLS, toPublic } from "@/lib/server/community";

export async function GET(req: Request) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const { data } = await c.db.from("community_profiles").select(PROFILE_COLS).eq("user_id", c.user.id).maybeSingle();
  const { data: blocks } = await c.db.from("community_blocks").select("blocked_id").eq("blocker_id", c.user.id);
  return NextResponse.json({
    profile: data ? { ...toPublic({ ...data, hidden_by_admin: false }), visible: data.visible, hiddenByAdmin: data.hidden_by_admin } : null,
    blocked: (blocks ?? []).map((b) => b.blocked_id),
  });
}

const body = z.object({
  name: z.string().trim().min(2).max(60),
  grade: z.number().int().min(7).max(16).nullable(),
  city: z.string().trim().max(60).nullable(),
  major: z.string().trim().max(40).nullable(),
  bio: z.string().trim().max(600),
  skills: z.array(z.string()).max(30),
  lookingFor: z.string().trim().max(200),
  visible: z.boolean(),
});

export async function PUT(req: Request) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", message: "Проверь поля карточки: имя от 2 символов." }, { status: 400 });
  const p = parsed.data;
  const { error } = await c.db.from("community_profiles").upsert(
    {
      user_id: c.user.id, display_name: p.name, grade: p.grade, city: p.city || null, major: p.major || null, bio: p.bio,
      skills: cleanList(p.skills), looking_for: p.lookingFor, visible: p.visible, updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: "db", message: "Не удалось сохранить карточку." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
