"use client";
import type { ContactInfo } from "./profileSchema";
import type { Profile } from "./types";

// Ответы анкеты живут в localStorage до сохранения в базу. Всё в try/catch: хранилище может быть недоступно.
const KEY = "unihelper:v1";

export interface Stored {
  profile?: Profile;
  contact?: ContactInfo;
  profileId?: string | null;
  draft?: Partial<Profile>;
  step?: number;
}

export function load(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Stored;
  } catch {
    return {};
  }
}

export function save(patch: Partial<Stored>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...load(), ...patch }));
  } catch {
    /* хранилище недоступно — продолжаем без него */
  }
}

export function reset(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
