"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { finishTelegramLogin } from "@/components/auth/LoginCard";
import { safePath } from "@/lib/telegram/client";

// Точка входа Telegram Mini App: бот открывает /tg?to=<раздел>, вход — по подписанному initData.
type TgWebApp = {
  initData: string;
  initDataUnsafe?: { start_param?: string };
  ready: () => void;
  expand: () => void;
  colorScheme?: "light" | "dark";
};

// start_param в Telegram — только [A-Za-z0-9_-]; разделы кодируем короткими именами.
const START: Record<string, string> = { programs: "/programs", mocks: "/mocks", roadmap: "/roadmap", community: "/community", chats: "/community/chats", quiz: "/quiz", courses: "/lessons" };

export default function TelegramMiniApp() {
  const router = useRouter();
  const [msg, setMsg] = useState("Открываем UniHelper…");

  async function onLoad() {
    const wa = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
    if (!wa?.initData) {
      setMsg("Эта страница открывается из Telegram-бота UniHelper.");
      return;
    }
    try {
      sessionStorage.setItem("uh-tg", "1");
    } catch {}
    wa.ready();
    wa.expand();
    if (wa.colorScheme) document.documentElement.dataset.theme = wa.colorScheme;
    const to = safePath(new URLSearchParams(location.search).get("to") ?? START[wa.initDataUnsafe?.start_param ?? ""] ?? "/dashboard");
    const ok = await finishTelegramLogin({ mode: "webapp", initData: wa.initData });
    if (ok) router.replace(to);
    else setMsg("Не удалось войти. Закройте приложение и откройте его из бота ещё раз.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onLoad={onLoad} />
      <div className="card max-w-sm text-center font-semibold" role="status">{msg}</div>
    </div>
  );
}
