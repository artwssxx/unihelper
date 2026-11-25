"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as I from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { SITE_URL } from "@/lib/site";
import { supabaseBrowser, supabaseEmailLink } from "@/lib/supabaseClient";

// Вход и регистрация: Telegram, Google, почта. Всё рассчитано на телефон:
// - Telegram — с перенаправлением (всплывающее окно на мобильных теряет связь со страницей);
// - почта — код из письма, который работает в любом браузере (ссылка из почтового приложения
//   часто открывается в другом браузере, и вход по ней не срабатывает);
// - во встроенных браузерах соцсетей Google блокирует вход — подсказываем открыть сайт в браузере.

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
// Виджет Telegram работает только на домене, привязанном к боту в @BotFather (/setdomain) — это основной адрес сайта.
const TG_HOST = new URL(SITE_URL).host;
const CODE_LEN = 8; // длина кода из письма (настройка Supabase mailer_otp_length)
// Код в письме есть, только если шаблон письма его содержит (нужен свой SMTP в Supabase) — тогда флаг = 1.
const EMAIL_OTP = process.env.NEXT_PUBLIC_EMAIL_OTP === "1";
const RESEND_SEC = 60;

export async function finishTelegramLogin(payload: unknown): Promise<boolean> {
  const sb = await supabaseBrowser();
  if (!sb) return false;
  const r = await fetch("/api/auth/telegram", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) return false;
  const { tokenHash } = await r.json();
  const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  return !error;
}

/** Встроенный браузер Instagram, Facebook, TikTok и т. п.: Google там вход запрещает. */
function inAppBrowser(): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|Snapchat|; wv\)/i.test(navigator.userAgent);
}

const emailError = (m: string) =>
  /rate|limit|seconds|security purposes/i.test(m)
    ? "Почта сейчас перегружена: письма уходят не чаще нескольких раз в час. Войдите через Telegram или Google — это быстрее."
    : /invalid|valid email/i.test(m)
      ? "Проверьте адрес почты."
      : "Не удалось отправить письмо. Попробуйте ещё раз или войдите через Telegram.";

/** haveCode — сразу ввод кода (ссылка из письма открылась в другом браузере). */
export default function LoginCard({ next = "/dashboard", mode = "login", signupHint = true, haveCode = false }: { next?: string; mode?: "login" | "register"; signupHint?: boolean; haveCode?: boolean }) {
  const router = useRouter();
  const { user, enabled, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">(haveCode && EMAIL_OTP ? "code" : "email");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [inApp, setInApp] = useState(false);
  const [tgHere, setTgHere] = useState<boolean | null>(null);
  const tgBox = useRef<HTMLDivElement>(null);

  const redirect = () => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  useEffect(() => {
    setInApp(inAppBrowser());
    // На других адресах сайта (например, unihelper.net) виджет показал бы «Bot domain invalid» —
    // там вместо него ссылка на вход через Telegram на основном адресе.
    setTgHere(location.host === TG_HOST || location.hostname === "localhost");
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Виджет Telegram в режиме перенаправления: после подтверждения Telegram вернёт на /auth/telegram.
  useEffect(() => {
    if (!BOT || !tgHere || !tgBox.current) return;
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", BOT);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "12");
    s.setAttribute("data-request-access", "write");
    s.setAttribute("data-auth-url", `${location.origin}/auth/telegram?next=${encodeURIComponent(next)}`);
    tgBox.current.innerHTML = "";
    tgBox.current.appendChild(s);
  }, [next, tgHere]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const sb = await supabaseEmailLink();
    if (!sb) return;
    setBusy(true);
    setErr(null);
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect(), shouldCreateUser: true } });
    setBusy(false);
    if (error) return setErr(emailError(error.message));
    setStep("code");
    setSent(true);
    setCode("");
    setWait(RESEND_SEC);
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    const sb = await supabaseBrowser();
    if (!sb || code.length < 6) return;
    setBusy(true);
    setErr(null);
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
    setBusy(false);
    if (error) return setErr(/expired|invalid/i.test(error.message) ? "Код неверный или устарел. Проверьте последнее письмо или запросите новый код." : "Не получилось войти. Попробуйте ещё раз.");
    router.replace(next);
  }

  async function google() {
    const sb = await supabaseBrowser();
    if (!sb) return;
    setErr(null);
    const { data, error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect(), skipBrowserRedirect: true } });
    if (error || !data.url) return setErr("Не удалось начать вход через Google.");
    location.href = data.url;
  }

  if (!enabled) {
    return <div className="card max-w-md text-center"><p>Вход пока недоступен: не подключена база.</p></div>;
  }

  return (
    <div className="card w-full max-w-md space-y-5 p-5 sm:p-7">
      <div className="flex items-center gap-2.5"><I.Logo /><span className="text-xl font-extrabold">{mode === "register" ? "Создай аккаунт" : "Вход в UniHelper"}</span></div>
      <p className="text-sm text-body">
        {mode === "register"
          ? "Без пароля: через Telegram, Google или письмо на почту. Ответы анкеты перенесутся в аккаунт."
          : "Без пароля. Аккаунт сохраняет профиль, моки и план на всех устройствах."}
      </p>

      <div className="space-y-2.5">
        {BOT && tgHere === false ? (
          <a className="btn-secondary w-full" href={`${SITE_URL}/login?next=${encodeURIComponent(next)}`}>
            <TgIcon />
            Войти через Telegram
          </a>
        ) : BOT ? (
          <div ref={tgBox} className="flex min-h-[44px] justify-center" aria-label="Войти через Telegram" />
        ) : (
          <button className="btn-secondary w-full" disabled title="Подключим вместе с ботом Unihelper">
            <TgIcon />
            Telegram — подключаем бота
          </button>
        )}
        <button className="btn-secondary w-full" onClick={google}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" /></svg>
          Войти через Google
        </button>
        {inApp && (
          <p className="rounded-xl bg-orange-soft px-3 py-2 text-xs font-semibold text-orange-ink-2">
            Похоже, сайт открыт внутри приложения (Instagram, Facebook…). Google там вход не пускает: откройте сайт в Chrome или Safari через меню «⋯» → «Открыть в браузере», или войдите через Telegram или почту.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs font-bold text-muted"><span className="h-px flex-1 bg-line" />ИЛИ ПО ПОЧТЕ<span className="h-px flex-1 bg-line" /></div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-2.5">
          <label className="block text-sm font-semibold">
            Email
            <input className="input mt-1.5" type="email" inputMode="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <button className="btn-primary w-full" disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())}>{busy ? "Отправляем…" : EMAIL_OTP ? "Получить код на почту" : "Получить письмо для входа"}</button>
          {EMAIL_OTP && <button type="button" className="w-full text-sm font-bold text-primary" onClick={() => { setStep("code"); setErr(null); }}>У меня уже есть код из письма</button>}
        </form>
      ) : !EMAIL_OTP ? (
        <div className="space-y-2.5">
          <p className="rounded-2xl bg-green-soft px-4 py-3 text-sm text-green">
            Письмо отправлено на <b translate="no">{email}</b>. Откройте его и нажмите кнопку входа — можно в любом браузере и на этом же телефоне. Письмо может прийти в «Спам».
          </p>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <button type="button" className="font-bold text-primary" onClick={() => { setStep("email"); setSent(false); setErr(null); }}>Изменить почту</button>
            <button type="button" className="font-bold text-primary disabled:text-muted" disabled={wait > 0 || busy} onClick={() => sendCode()}>
              {wait > 0 ? `Отправить снова через ${wait} с` : "Отправить письмо снова"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={verify} className="space-y-2.5">
          {sent ? (
            <p className="rounded-2xl bg-green-soft px-4 py-3 text-sm text-green">
              Письмо отправлено на <b translate="no">{email}</b>. Введите код из письма — или нажмите кнопку в письме, если открываете его в этом же браузере. Письмо может прийти в «Спам».
            </p>
          ) : (
            <label className="block text-sm font-semibold">
              Email, на который пришло письмо
              <input className="input mt-1.5" type="email" inputMode="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
          )}
          <label className="block text-sm font-semibold">
            Код из письма
            <input
              className="input mt-1.5 text-center font-mono text-2xl tracking-[0.3em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_LEN}
              value={code}
              autoFocus={sent}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LEN))}
              placeholder={"•".repeat(CODE_LEN)}
              aria-label="Код из письма"
            />
          </label>
          <button className="btn-primary w-full" disabled={busy || code.length < 6 || !email.includes("@")}>{busy ? "Проверяем…" : "Войти"}</button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <button type="button" className="font-bold text-primary" onClick={() => { setStep("email"); setSent(false); setErr(null); }}>{sent ? "Изменить почту" : "Назад"}</button>
            <button type="button" className="font-bold text-primary disabled:text-muted" disabled={wait > 0 || busy || !email.includes("@")} onClick={() => sendCode()}>
              {wait > 0 ? `Отправить снова через ${wait} с` : "Отправить код снова"}
            </button>
          </div>
        </form>
      )}
      {err && <p className="text-sm font-semibold text-red" role="alert">{err}</p>}
      {mode === "login" && signupHint && (
        <p className="rounded-xl bg-bg px-3 py-2 text-sm text-body">
          Нет аккаунта? Войди любым способом выше — аккаунт создастся сам, а потом короткая анкета на 3 минуты.
        </p>
      )}
      <p className="text-xs leading-relaxed text-muted">
        Продолжая, вы соглашаетесь на обработку данных. Если вам нет 18 лет — согласие должен дать родитель. <Link href="/" className="font-bold text-primary">На главную</Link>
      </p>
    </div>
  );
}

function TgIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 3-20 8 7 2 2 7 4-5 5 4z" /></svg>
  );
}
