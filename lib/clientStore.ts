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

export type PortfolioTemplate = "minimal" | "creative" | "academic" | "bold" | "night";
export interface PortfolioBlock {
  id: string;
  type: "text" | "links" | "skills";
  title: string;
  text?: string;
  links?: { label: string; url: string }[];
  items?: string[];
}
export interface PortfolioState {
  slug: string;
  template: PortfolioTemplate;
  visibility: "draft" | "link" | "public";
  about: string;
  headline?: string;
  sections: Record<string, boolean>;
  showFields: Record<string, boolean>;
  projects: { title: string; text: string }[];
  /** Порядок разделов (встроенные и свои блоки). */
  order?: string[];
  blocks?: PortfolioBlock[];
  accent?: string;
  font?: "sans" | "serif";
  hideBadge?: boolean;
  /** Опубликовано: адрес и токен ссылки (для режима «по ссылке»). */
  published?: { url: string; at: string } | null;
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
  /** Свои вузы ученика (добавлены через подбор). */
  customUnis?: import("./types").Program[];
  /** Демо для инвесторов: вымышленный ученик и пошаговый тур. */
  demo?: { active: boolean; step: number; tour: boolean };
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
/** Подписка на любые изменения хранилища (для синхронизации с аккаунтом). */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

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
