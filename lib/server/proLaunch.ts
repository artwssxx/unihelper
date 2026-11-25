import "server-only";
import { supabaseAdmin } from "./supabase";

export function launchCard() {
  const digits = process.env.PRO_LAUNCH_CARD?.replace(/\s/g, "");
  return digits && /^\d{16}$/.test(digits) ? digits.match(/.{4}/g)!.join(" ") : null;
}

export async function launchAccessUntil(userId: string) {
  const { data, error } = await supabaseAdmin()!.from("pro_launch_payments")
    .select("access_until").eq("user_id", userId).eq("status", "approved")
    .gt("access_until", new Date().toISOString()).order("access_until", { ascending: false }).limit(1).maybeSingle();
  if (error && error.code !== "PGRST205") throw error;
  return data?.access_until ? Date.parse(data.access_until) : null;
}
