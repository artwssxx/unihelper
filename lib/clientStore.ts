"use client";

import { useSyncExternalStore } from "react";
import type { ContactInfo } from "./profileSchema";
import type { ScoreRecord } from "./scores";
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
  /** Результаты IELTS/SAT ученика (официальные или со слов) с разбором. Файлы не храним — только баллы. */
  scores?: ScoreRecord[];
  /** История силы профиля 1–100: последнее значение и дата изменения. */
  strengthHistory?: { score: number; at: string }[];
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
  /** Аккаунт родителя: без своей анкеты, кабинет — /parent. */
  role?: "parent";
}

const listeners = new Set<() => void>();
// Разобранное состояние для useStore: один JSON.parse на изменение, а не на каждый компонент.
let snap: Stored | null = null;

export function load(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Stored;
  } catch {
    return {};
  }
}

/** Флаг демо на <html> — по нему CSS не мигает экраном входа при переходах (см. AuthGate). */
function markDemo(on: boolean) {
  document.documentElement.toggleAttribute("data-demo", on);
}

function emit(next: Stored) {
  snap = next;
  markDemo(Boolean(next.demo?.active));
  listeners.forEach((l) => l());
}

export function save(patch: Partial<Stored>): void {
  const next = { ...load(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* хранилище недоступно — продолжаем без него */
  }
  emit(next);
}

export function update(fn: (s: Stored) => Partial<Stored>): void {
  save(fn(load()));
}

export function reset(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  emit({});
}

/** Подписка на любые изменения хранилища (для синхронизации с аккаунтом). */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function subscribeStore(fn: () => void): () => void {
  // Изменения из другой вкладки: сбрасываем кеш и перечитываем.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== null) return;
    snap = null;
    fn();
  };
  listeners.add(fn);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** Хук: актуальное состояние хранилища; null на сервере и при гидрации (как в HTML). */
export function useStore(): Stored | null {
  return useSyncExternalStore(subscribeStore, () => (snap ??= load()), () => null);
}
