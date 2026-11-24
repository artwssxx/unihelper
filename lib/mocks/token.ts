import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { ModuleRecord } from "./engine";
import type { Exam, Mode, Section } from "./types";

// Состояние попытки живёт в подписанном токене: сервер не доверяет клиенту
// ни список вопросов, ни дедлайн, ни ответы прошлых модулей.

export interface AttemptState {
  v: 1;
  id: string;
  exam: Exam;
  section: Section;
  mode: Mode;
  module: number;
  totalModules: number;
  qids: string[];
  startedAt: number;
  /** Хард-режим: дедлайн модуля на сервере (мс). Лёгкий режим: null. */
  deadlineAt: number | null;
  done: ModuleRecord[];
  path?: "easy" | "hard";
}

function secret(): string {
  const s = process.env.MOCK_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    console.warn("[mocks] MOCK_SECRET не задан — используется запасной ключ. Задайте MOCK_SECRET в настройках Vercel.");
  }
  return "unihelper-dev-secret-change-me";
}

const b64 = (buf: Buffer) => buf.toString("base64url");

export function sign(state: AttemptState): string {
  const body = b64(Buffer.from(JSON.stringify(state)));
  const mac = b64(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${mac}`;
}

export function verify(token: string): AttemptState | null {
  if (typeof token !== "string" || token.length > 200_000) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const got = Buffer.from(mac, "base64url");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    const st = JSON.parse(Buffer.from(body, "base64url").toString()) as AttemptState;
    return st.v === 1 ? st : null;
  } catch {
    return null;
  }
}
