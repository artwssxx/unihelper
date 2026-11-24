"use client";

import { useEffect, useState } from "react";
import type { ContactInfo } from "./profileSchema";
import type { Profile } from "./types";

// Пока нет входа и базы, личные данные ученика живут в localStorage.
// Всё в try/catch: в приватном окне хранилище может быть недоступно.
const KEY = "unihelper:v1";

export type StepStatus = "todo" | "doing" | "done";

export interface MockHistoryItem {
  attemptId: string;
  exam: "sat" | "ielts";
  section: "math" | "rw" | "reading" | "writing";
  mode: "light" | "hard";
  status: "completed" | "interrupted";
  finishedAt: string;
  scoreLow?: number;
  scoreHigh?: number;
  band?: number;
  weakDomains?: string[];
}

export interface EventRegistration {
  status: "registered" | "waitlist" | "cancelled";
  ticket: string;
  sharedFields: string[];
  at: string;
}

export interface PortfolioState {
  slug: string;
  template: "minimal" | "creative" | "academic";
  visibility: "draft" | "link" | "public";
  about: string;
  sections: Record<string, boolean>;
  showFields: Record<string, boolean>;
  projects: { title: string; text: string }[];
}

export interface EssayVersion {
  id: string;
  prompt: string;
  text: string;
  at: string;
  feedback?: unknown;
}

export interface Stored {
  profile?: Profile;
  contact?: ContactInfo;
  profileId?: string | null;
  draft?: Partial<Profile>;
  step?: number;
  myPrograms?: string[];
  roadmap?: Record<string, StepStatus>;
  customSteps?: { id: string; title: string; month: string; track: string }[];
  mocks?: MockHistoryItem[];
  events?: Record<string, EventRegistration>;
  lessons?: Record<string, { watched: boolean; quizScore?: number }>;
  portfolio?: PortfolioState;
  essays?: EssayVersion[];
  /** id вопросов из прошлых моков — чтобы давать новые. */
  seenQuestions?: string[];
}

const listeners = new Set<() => void>();

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
  listeners.forEach((l) => l());
}

export function update(fn: (s: Stored) => Partial<Stored>): void {
  save(fn(load()));
}

export function reset(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

/** Хук: актуальное состояние хранилища; null до гидрации. */
export function useStore(): Stored | null {
  const [state, setState] = useState<Stored | null>(null);
  useEffect(() => {
    const sync = () => setState(load());
    sync();
    listeners.add(sync);
    window.addEventListener("storage", sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}
