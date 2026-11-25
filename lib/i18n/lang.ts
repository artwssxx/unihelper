"use client";

import { useEffect, useState } from "react";
import { isLang, type Lang } from "./translate";

// Язык интерфейса: один на весь сайт (лендинг, кабинет, анкета), хранится в localStorage «uh-lang».

const KEY = "uh-lang";
const EVENT = "uh-lang";

export function getLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    return isLang(v) ? v : "ru";
  } catch {
    return "ru";
  }
}

export function setLang(l: Lang): void {
  try {
    localStorage.setItem(KEY, l);
  } catch {}
  document.documentElement.lang = l;
  window.dispatchEvent(new CustomEvent<Lang>(EVENT, { detail: l }));
}

/** Текущий язык; "ru" до гидрации (так совпадает с HTML с сервера). */
export function useLang(): Lang {
  const [lang, set] = useState<Lang>("ru");
  useEffect(() => {
    set(getLang());
    const on = (e: Event) => set((e as CustomEvent<Lang>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return lang;
}
