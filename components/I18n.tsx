"use client";

import { useEffect } from "react";
import { translateDom } from "@/lib/i18n/dom";
import { useLang } from "@/lib/i18n/lang";
import type { Dict, Lang } from "@/lib/i18n/translate";

// Перевод всего сайта на узбекский/английский. Словарь грузится отдельным чанком только для uz/en.
// До первого прохода страница скрыта (html[data-lang] без data-tr, см. globals.css) — без вспышки русского.

const load: Record<Exclude<Lang, "ru">, () => Promise<Dict>> = {
  uz: () => import("@/lib/i18n/dict/uz.json").then((m) => m.default as Dict),
  en: () => import("@/lib/i18n/dict/en.json").then((m) => m.default as Dict),
};

export default function I18n() {
  const lang = useLang();
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    if (lang === "ru") {
      html.removeAttribute("data-lang");
      html.dataset.tr = "1";
      return;
    }
    html.dataset.lang = lang;
    let stop: (() => void) | null = null;
    let cancelled = false;
    load[lang]()
      .then((dict) => {
        if (cancelled) return;
        const t = translateDom(dict);
        stop = t.stop;
        (window as unknown as { __i18nMissing?: Set<string> }).__i18nMissing = t.missing;
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) html.dataset.tr = "1";
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [lang]);
  return null;
}
