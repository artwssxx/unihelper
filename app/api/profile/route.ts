import { NextResponse } from "next/server";
import { z } from "zod";
import { contactSchema, profileSchema } from "@/lib/profileSchema";
import { supabaseAdmin } from "@/lib/server/supabase";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";

const body = z.object({
  profile: profileSchema,
  contact: contactSchema,
  // До 18 лет обязательно согласие родителя на обработку данных.
  parentConsent: z.literal(true),
});

export async function POST(req: Request) {
  if (!takeQuota(clientKey(req) + ":profile", 20).ok)
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  const { profile, contact } = parsed.data;

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ id: crypto.randomUUID(), demo: true });

  const { data, error } = await db
    .from("profiles")
    .insert({
      full_name: contact.fullName,
      phone: contact.phone,
      email: contact.email || null,
      grade: profile.grade,
      city: profile.city,
      gpa: profile.gpa,
      gpa_scale: profile.gpaScale,
      ielts: profile.ielts,
      sat: profile.sat,
      achievements_text: profile.achievementsText,
      best_achievement_level: profile.bestAchievementLevel,
      activities_count: profile.activitiesCount,
      led_something: profile.ledSomething,
      target_countries: profile.targetCountries,
      target_major: profile.major,
      budget_usd: profile.budgetUsd,
      parent_consent_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    console.error("[profile]", error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, demo: false });
}
