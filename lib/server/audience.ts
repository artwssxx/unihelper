import "server-only";
import { createSign } from "node:crypto";
import { supabaseAdmin } from "@/lib/server/supabase";

export async function registeredUsers(): Promise<number | null> {
  try {
    const db = supabaseAdmin();
    if (!db) return null;
    const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) return null;
    if (data.users.length === 0) return 0;
    return Number.isSafeInteger(data.total) && data.total >= data.users.length ? data.total : null;
  } catch {
    return null;
  }
}

const tokenUrl = "https://oauth2.googleapis.com/token";
const scope = "https://www.googleapis.com/auth/analytics.readonly";

export async function visitorsLast30Days(): Promise<number | null> {
  const property = process.env.GA4_PROPERTY_ID;
  const credentials = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (!property || !/^\d+$/.test(property) || !credentials) return null;

  try {
    const { client_email, private_key } = JSON.parse(credentials);
    if (typeof client_email !== "string" || typeof private_key !== "string") return null;
    const now = Math.floor(Date.now() / 1000);
    const claims = { iss: client_email, scope, aud: tokenUrl, iat: now, exp: now + 300 };
    const assertion = [
      Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url"),
      Buffer.from(JSON.stringify(claims)).toString("base64url"),
    ].join(".");
    const signature = createSign("RSA-SHA256").update(assertion).sign(private_key, "base64url");
    const signal = AbortSignal.timeout(5000);
    const token = await fetch(tokenUrl, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${assertion}.${signature}`,
      }),
      cache: "no-store",
      signal,
    });
    if (!token.ok) return null;
    const { access_token } = await token.json();
    if (typeof access_token !== "string" || !access_token) return null;

    const report = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: "29daysAgo", endDate: "today" }],
        metrics: [{ name: "totalUsers" }],
      }),
      cache: "no-store",
      signal,
    });
    if (!report.ok) return null;
    const { rows, rowCount } = await report.json();
    if ((rows == null && rowCount == null) || rowCount === 0) return 0;
    const value = rows?.[0]?.metricValues?.[0]?.value;
    if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
    const count = Number(value);
    return Number.isSafeInteger(count) ? count : null;
  } catch {
    return null;
  }
}
