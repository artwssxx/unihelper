"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as I from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabaseClient";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export async function finishTelegramLogin(payload: unknown): Promise<boolean> {
  const sb = supabaseBrowser();
  if (!sb) return false;
  const r = await fetch("/api/auth/telegram", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) return false;
  const { tokenHash } = await r.json();
  const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  return !error;
}

export default function LoginCard({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const { user, enabled, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const tgBox = useRef<HTMLDivElement>(null);

  const redirect = () => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  // Виджет входа Telegram (нужны бот и домен, привязанный в @BotFather командой /setdomain).
  useEffect(() => {
    if (!BOT || !tgBox.current) return;
    (window as unknown as { onTelegramAuth: (u: unknown) => void }).onTelegramAuth = async (u: unknown) => {
      setErr(null);
      if (await finishTelegramLogin({ mode: "widget", data: u })) router.replace(next);
      else setErr("Не удалось войти через Telegram. Попробуйте ещё раз.");
    };
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", BOT);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "12");
    s.setAttribute("data-request-access", "write");
    s.setAttribute("data-onauth", "onTelegramAuth(user)");
    tgBox.current.innerHTML = "";
    tgBox.current.appendChild(s);
  }, [router, next]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabaseBrowser();
    if (!sb) return;
    setState("sending");
    setErr(null);
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect(), shouldCreateUser: true } });
    if (error) {
      setState("error");
      setErr(/rate|limit|seconds/i.test(error.message) ? "Слишком много писем за короткое время. Подождите несколько минут." : "Не удалось отправить письмо. Проверьте адрес.");
    } else setState("sent");
  }

  async function google() {
    const sb = supabaseBrowser();
    if (!sb) return;
    setErr(null);
    const { data, error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect(), skipBrowserRedirect: true } });
    if (error || !data.url) return setErr("Не удалось начать вход через Google.");
    // Проверяем, что провайдер включён, прежде чем уводить со страницы.
    const probe = await fetch(data.url, { redirect: "manual" }).catch(() => null);
    if (probe && probe.status === 400) return setErr("Вход через Google ещё не включён администратором.");
    location.href = data.url;
  }

  if (!enabled) {
    return <div className="card max-w-md text-center"><p>Вход пока недоступен: не подключена база.</p></div>;
  }

  return (
    <div className="card w-full max-w-md space-y-5 p-7">
      <div className="flex items-center gap-2.5"><I.Logo /><span className="text-xl font-extrabold">Вход в UniHelper</span></div>
      <p className="text-sm text-body">Аккаунт сохраняет профиль, моки и план на всех устройствах. Данные из этого браузера перенесутся в аккаунт.</p>

      <div className="space-y-2.5">
        {BOT ? (
          <div ref={tgBox} className="flex min-h-[44px] justify-center" aria-label="Войти через Telegram" />
        ) : (
          <button className="btn-secondary w-full" disabled title="Подключим вместе с ботом Unihelper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 3-20 8 7 2 2 7 4-5 5 4z" /></svg>
            Telegram — подключаем бота
          </button>
        )}
        <button className="btn-secondary w-full" onClick={google}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" /></svg>
          Войти через Google
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs font-bold text-muted"><span className="h-px flex-1 bg-line" />ИЛИ ПО ПОЧТЕ<span className="h-px flex-1 bg-line" /></div>

      {state === "sent" ? (
        <div className="rounded-2xl bg-green-soft px-4 py-3 text-sm text-green">
          Письмо отправлено на <b>{email}</b>. Откройте ссылку из письма в этом же браузере — вход произойдёт автоматически. Письмо может прийти в «Спам».
        </div>
      ) : (
        <form onSubmit={sendLink} className="space-y-2.5">
          <label className="block text-sm font-semibold">
            Email
            <input className="input mt-1.5" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <button className="btn-primary w-full" disabled={state === "sending" || !email.includes("@")}>{state === "sending" ? "Отправляем…" : "Получить ссылку для входа"}</button>
        </form>
      )}
      {err && <p className="text-sm font-semibold text-red">{err}</p>}
      <p className="text-xs leading-relaxed text-muted">
        Продолжая, вы соглашаетесь на обработку данных. Если вам нет 18 лет — согласие должен дать родитель. <Link href="/" className="font-bold text-primary">На главную</Link>
      </p>
    </div>
  );
}
