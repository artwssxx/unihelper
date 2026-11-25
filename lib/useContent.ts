"use client";

import { useEffect, useState } from "react";
import { PROGRAMS } from "@/data/programs";
import { EVENTS, type EventItem } from "@/lib/content/events";
import { LESSONS, type Lesson } from "@/lib/content/lessons";
import type { Program } from "@/lib/types";

// Контент сайта с учётом правок из админки. Пока грузится — значения из кода.
export interface SiteContent {
  programs: Program[];
  events: EventItem[];
  lessons: Lesson[];
}

const DEFAULT: SiteContent = { programs: PROGRAMS, events: EVENTS, lessons: LESSONS };
let cache: SiteContent | null = null;
let pending: Promise<SiteContent> | null = null;

function fetchContent(): Promise<SiteContent> {
  pending ??= fetch("/api/content")
    .then((r) => (r.ok ? r.json() : DEFAULT))
    .then((j: SiteContent) => (cache = { programs: j.programs ?? PROGRAMS, events: j.events ?? EVENTS, lessons: j.lessons ?? LESSONS }))
    .catch(() => DEFAULT);
  return pending;
}

export function useContent(): SiteContent {
  const [c, setC] = useState<SiteContent>(cache ?? DEFAULT);
  useEffect(() => {
    let alive = true;
    fetchContent().then((x) => alive && setC(x));
    return () => {
      alive = false;
    };
  }, []);
  return c;
}

export function lessonsForDomainsIn(lessons: Lesson[], domains: string[], limit = 3): Lesson[] {
  const out: Lesson[] = [];
  for (const d of domains) for (const l of lessons) if (l.domains.includes(d) && !out.includes(l)) out.push(l);
  return out.slice(0, limit);
}
