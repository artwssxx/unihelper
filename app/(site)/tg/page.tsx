"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { finishTelegramLogin } from "@/components/auth/LoginCard";

// Точка входа Telegram Mini App: бот открывает этот адрес, вход — по подписанному initData.
type TgWebApp = { initData: string; ready: () => void; expand: () => void; colorScheme?: "light" | "dark" };

export default function TelegramMiniApp() {
  const router = useRouter();
  const [msg, setMsg] = useState("Открываем UniHelper…");
  async function onLoad() {
    const wa = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
    if (!wa?.initData) {
      setMsg("Эта страница открывается из Telegram-бота UniHelper.");
      return;
    }
    wa.ready();
    wa.expand();
    if (wa.colorScheme) document.documentElement.dataset.theme = wa.colorScheme;
    const ok = await finishTelegramLogin({ mode: "webapp", initData: wa.initData });
    if (ok) router.replace("/dashboard");
    else setMsg("Не удалось войти. Откройте приложение из бота ещё раз.");
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onLoad={onLoad} />
      <div className="card max-w-sm text-center font-semibold">{msg}</div>
    </div>
  );
}
