"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GA_ID, getConsent, isUntracked, pageView, setConsent, type Consent } from "@/lib/analytics";

// Подключение GA4 и плашка согласия. Без согласия — только обезличенные посещения (без cookies).

function tabId(): string {
  try {
    let id = sessionStorage.getItem("uh-ga-tab");
    if (!id) {
      id = `${Math.floor(Math.random() * 2 ** 31)}.${Math.floor(Date.now() / 1000)}`;
      sessionStorage.setItem("uh-ga-tab", id);
    }
    return id;
  } catch {
    return `${Math.floor(Math.random() * 2 ** 31)}.${Math.floor(Date.now() / 1000)}`;
  }
}

function siteTabId(): string {
  const key = "uh-site-tab";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

type W = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

/** Настройка GA под текущее согласие: с cookies или без них. Первый вызов создаёт gtag. */
function configure(consent: Consent) {
  const w = window as W;
  if (!w.gtag) {
    w.dataLayer = w.dataLayer ?? [];
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
    // Реклама выключена всегда; аналитика — без cookies, пока нет согласия (см. client_storage ниже).
    w.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    w.gtag("js", new Date());
  }
  const granted = consent === "granted";
  w.gtag("config", GA_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    client_storage: granted ? "cookie" : "none",
    ...(granted ? {} : { client_id: tabId() }),
  });
}

export default function Analytics() {
  const path = usePathname();
  const [consent, setC] = useState<Consent>(null);
  const [ready, setReady] = useState(false);
  const [banner, setBanner] = useState(false);
  const last = useRef<string | null>(null);
  const lastSitePath = useRef<string | null>(null);
  const siteTab = useRef<string | null>(null);

  useEffect(() => {
    if (!path || path === lastSitePath.current) return;
    lastSitePath.current = path;
    if (isUntracked(path) || !globalThis.crypto?.randomUUID) return;

    siteTab.current ??= siteTabId();
    void fetch("/api/analytics/page-view", {
      method: "POST",
      headers: { "x-unihelper-tab": siteTab.current },
      credentials: "omit",
      referrerPolicy: "no-referrer",
      keepalive: true,
    }).catch(() => {});
  }, [path]);

  useEffect(() => {
    if (!GA_ID) return;
    const c = getConsent();
    setC(c);
    configure(c);
    setReady(true);
    setBanner(c === null);
    const onChange = (e: Event) => {
      const v = (e as CustomEvent).detail as Consent;
      setC(v);
      configure(v);
      setBanner(false);
    };
    const onOpen = () => setBanner(true);
    window.addEventListener("uh-consent", onChange);
    window.addEventListener("uh-consent-open", onOpen);
    return () => {
      window.removeEventListener("uh-consent", onChange);
      window.removeEventListener("uh-consent-open", onOpen);
    };
  }, []);

  // Посещение при каждом переходе (в т. ч. без перезагрузки страницы).
  useEffect(() => {
    if (!ready || !path || last.current === path) return;
    last.current = path;
    pageView(path);
  }, [ready, path, consent]);

  if (!GA_ID) return null;
  const hideBanner = !banner || isUntracked(path ?? "") || (path ?? "").startsWith("/mocks/run") || (path ?? "").startsWith("/tg");

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      {!hideBanner && (
        <div
          role="dialog"
          aria-label="Аналитика"
          className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-[620px] rounded-[20px] border border-line bg-surface-solid p-4 shadow-2xl sm:p-5"
        >
          <p className="text-sm text-body">
            Мы считаем посещения страниц обезличенно — без cookies и без личных данных. Разрешите аналитику, чтобы мы видели, какие функции полезны (моки, подбор вузов, уроки): это помогает делать UniHelper лучше. Реклама не используется.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary px-4 py-2 text-sm" onClick={() => setConsent("granted")}>Разрешить</button>
            <button className="btn-secondary px-4 py-2 text-sm" onClick={() => setConsent("denied")}>Только посещения</button>
          </div>
        </div>
      )}
    </>
  );
}
