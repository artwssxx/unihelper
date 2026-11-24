"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Связка с Telegram Mini App: кнопка «Назад» Telegram, тема и цвета шапки.
// Работает только если сайт открыт из бота (флаг ставит /tg), иначе ничего не делает.

type WA = {
  initData: string;
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  onEvent?: (e: string, cb: () => void) => void;
  offEvent?: (e: string, cb: () => void) => void;
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
};

const ROOTS = new Set(["/dashboard", "/tg"]);
const BG = { light: "#f5f6fa", dark: "#0a0e1c" };

function getWA(): WA | null {
  const wa = (window as unknown as { Telegram?: { WebApp?: WA } }).Telegram?.WebApp;
  return wa?.initData ? wa : null;
}

export default function TelegramBridge() {
  const router = useRouter();
  const path = usePathname();
  const [wa, setWa] = useState<WA | null>(null);

  // Подключаемся, если вкладка помечена как мини-приложение (пометку ставит /tg, поэтому проверяем при каждом переходе).
  useEffect(() => {
    if (wa) return;
    let flag = false;
    try {
      flag = sessionStorage.getItem("uh-tg") === "1";
    } catch {}
    if (!flag) return;
    const ready = () => {
      const w = getWA();
      if (!w) return;
      document.documentElement.dataset.tg = "1";
      w.ready();
      w.expand();
      setWa(w);
    };
    if (getWA()) return ready();
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-web-app.js";
    s.onload = ready;
    document.head.appendChild(s);
  }, [path, wa]);

  // Тема Telegram → тема сайта и цвет шапки.
  useEffect(() => {
    if (!wa) return;
    const apply = () => {
      const scheme = wa.colorScheme === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = scheme;
      wa.setHeaderColor?.(BG[scheme]);
      wa.setBackgroundColor?.(BG[scheme]);
    };
    apply();
    wa.onEvent?.("themeChanged", apply);
    return () => wa.offEvent?.("themeChanged", apply);
  }, [wa]);

  // Кнопка «Назад» Telegram вместо браузерной.
  useEffect(() => {
    const bb = wa?.BackButton;
    if (!bb) return;
    const back = () => (window.history.length > 1 ? router.back() : router.push("/dashboard"));
    if (ROOTS.has(path)) bb.hide();
    else bb.show();
    bb.onClick(back);
    return () => bb.offClick(back);
  }, [wa, path, router]);

  return null;
}
