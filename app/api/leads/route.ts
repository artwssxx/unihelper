import { NextResponse } from "next/server";
import { z } from "zod";
import { getProgram } from "@/data/programs";
import { contactSchema, profileSchema } from "@/lib/profileSchema";
import { LEVEL_NAMES, scoreProfile } from "@/lib/scoring/strength";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { supabaseAdmin } from "@/lib/server/supabase";
import { notifyAdmins } from "@/lib/server/telegram";

const body = z.object({
  programId: z.string().max(64),
  profileId: z.string().uuid().nullish(),
  profile: profileSchema,
  contact: contactSchema,
  // Контакт уходит вузу только по явной кнопке студента и с согласием.
  consent: z.literal(true),
});

export async function POST(req: Request) {
  if (!takeQuota(clientKey(req) + ":lead", 15).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { programId, profileId, profile, contact } = parsed.data;
  const program = getProgram(programId);
  if (!program) return NextResponse.json({ error: "unknown_program" }, { status: 404 });

  const db = supabaseAdmin();
  if (db) {
    const row = {
      profile_id: profileId ?? null,
      program_id: program.id,
      full_name: contact.fullName,
      phone: contact.phone,
      email: contact.email || null,
      consent_at: new Date().toISOString(),
    };
    let { error } = await db.from("leads").insert(row);
    // Профиль из браузера может не существовать в базе — сохраняем заявку без привязки.
    if (error?.code === "23503") ({ error } = await db.from("leads").insert({ ...row, profile_id: null }));
    if (error) {
      console.error("[leads]", error);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  }

  const strength = scoreProfile(profile);
  await notifyAdmins(
    [
      "🎓 Новый лид Unihelper",
      `Вуз: ${program.university}${program.isPartner ? " (партнёр)" : ""}`,
      `Имя: ${contact.fullName}`,
      `Телефон: ${contact.phone}`,
      contact.email ? `Email: ${contact.email}` : null,
      `Класс: ${profile.grade}, город: ${profile.city}`,
      `Profile Strength: ${LEVEL_NAMES[strength.overall]}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return NextResponse.json({ ok: true, demo: !db });
}
