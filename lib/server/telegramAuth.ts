import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Проверка данных входа через Telegram: Login Widget на сайте и initData мини-приложения.
// Обе подписи — HMAC-SHA256 от токена бота (официальная схема Telegram).

export interface TgUser { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string }

const eqHex = (a: string, b: string) => {
  const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};

export function verifyLoginWidget(data: Record<string, string | number>, botToken: string, maxAgeSec = 86400): TgUser | null {
  const { hash, ...rest } = data;
  if (typeof hash !== "string") return null;
  const check = Object.keys(rest).sort().map((k) => `${k}=${rest[k]}`).join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const calc = createHmac("sha256", secret).update(check).digest("hex");
  if (!eqHex(calc, hash)) return null;
  if (Date.now() / 1000 - Number(rest.auth_date) > maxAgeSec) return null;
  return { id: Number(rest.id), first_name: rest.first_name as string, last_name: rest.last_name as string, username: rest.username as string, photo_url: rest.photo_url as string };
}

export function verifyWebAppInitData(initData: string, botToken: string, maxAgeSec = 86400): TgUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calc = createHmac("sha256", secret).update(check).digest("hex");
  if (!eqHex(calc, hash)) return null;
  if (Date.now() / 1000 - Number(params.get("auth_date")) > maxAgeSec) return null;
  try {
    return JSON.parse(params.get("user") ?? "null");
  } catch {
    return null;
  }
}
