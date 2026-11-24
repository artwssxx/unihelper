"use client";

import { load, update, type MockHistoryItem } from "@/lib/clientStore";
import type { Exam, Mode, MockResult, Passage, PublicQuestion, Section } from "./types";

// Клиентская часть моков: активная попытка в localStorage (каждый ответ сохраняется сразу),
// результаты и история.

export interface AttemptPayload {
  token: string;
  attemptId: string;
  module: number;
  totalModules: number;
  durationSec: number;
  deadlineAt: number | null;
  serverNow: number;
  questions: PublicQuestion[];
  passages?: Passage[];
  writing?: {
    task1: { title: string; minutes: number; minWords: number; prompt: string; chart: { unit: string; series: string[]; categories: { label: string; values: number[] }[] } };
    task2: { title: string; minutes: number; minWords: number; prompt: string };
  };
}

export interface ActiveAttempt {
  exam: Exam;
  section: Section;
  mode: Mode;
  att: AttemptPayload;
  receivedAt: number;
  answers: Record<string, string>;
  times: Record<string, number>;
  flags: string[];
  cur: number;
  /** Лёгкий режим: оставшееся время (мягкий таймер, можно паузу). */
  lightRemaining: number;
  essays?: { task1: string; task2: string };
}

const ACTIVE = "unihelper:attempt";
const RESULT = "unihelper:result:";

export function loadActive(): ActiveAttempt | null {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE) || "null");
  } catch {
    return null;
  }
}
export function saveActive(a: ActiveAttempt | null) {
  try {
    if (a) localStorage.setItem(ACTIVE, JSON.stringify(a));
    else localStorage.removeItem(ACTIVE);
  } catch {}
}

export type StoredResult =
  | { kind: "test"; result: MockResult; finishedAt: string }
  | { kind: "writing"; result: WritingResult; finishedAt: string; mode: Mode }
  | { kind: "interrupted"; attemptId: string; exam: Exam; section: Section; review?: MockResult["review"]; finishedAt: string };

export interface WritingCriterion { name: string; band: number; quotes: string[]; comment: string }
export interface WritingResult {
  attemptId: string;
  counts: { task1: number; task2: number };
  minWords: { task1: number; task2: number };
  ai: boolean;
  limit?: boolean;
  error?: string;
  task1?: { criteria: WritingCriterion[]; overallLow: number; overallHigh: number; tips: string[] } | null;
  task2?: { criteria: WritingCriterion[]; overallLow: number; overallHigh: number; tips: string[] } | null;
  texts?: { task1: string; task2: string };
}

export function saveResult(id: string, r: StoredResult) {
  try {
    localStorage.setItem(RESULT + id, JSON.stringify(r));
  } catch {}
}
export function loadResult(id: string): StoredResult | null {
  try {
    return JSON.parse(localStorage.getItem(RESULT + id) || "null");
  } catch {
    return null;
  }
}

export function pushHistory(item: MockHistoryItem, seen: string[] = []) {
  update((s) => ({
    mocks: [...(s.mocks ?? []).filter((m) => m.attemptId !== item.attemptId), item],
    seenQuestions: [...new Set([...(s.seenQuestions ?? []), ...seen])].slice(-3000),
  }));
}

export function seenQuestions(): string[] {
  return load().seenQuestions ?? [];
}

export const SECTION_TITLE: Record<Section, string> = {
  math: "SAT · Math",
  rw: "SAT · Reading & Writing",
  reading: "IELTS · Reading",
  writing: "IELTS · Writing",
};

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Открыта ли страница внутри Telegram (мини-приложение). Сам скрипт Telegram может быть загружен и вне его. */
export function inTelegram(): boolean {
  if (typeof window === "undefined") return false;
  const wa = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
  let flag = false;
  try {
    flag = sessionStorage.getItem("uh-tg") === "1";
  } catch {}
  return Boolean(wa?.initData) || flag || /Telegram/i.test(navigator.userAgent);
}

/** Хард-режим недоступен на телефоне и в Telegram: там уведомления дают ложные срабатывания. */
export function hardModeAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const tg = inTelegram();
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return !tg && !coarse && !mobile && Boolean(document.documentElement.requestFullscreen);
}

export function deviceInfo() {
  return {
    telegram: inTelegram(),
    coarse: window.matchMedia?.("(pointer: coarse)").matches ?? false,
  };
}
