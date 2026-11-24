// Google Analytics 4. ID — переменная NEXT_PUBLIC_GA_ID (G-XXXXXXX); без неё аналитика выключена.
// Посещения страниц считаем всегда, но обезличенно: без cookies (client_storage: none), со случайным
// ID на одну вкладку. Cookies GA и события продукта — только после согласия посетителя.
// Рекламные функции Google выключены всегда: пользователи — в основном несовершеннолетние.

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
const KEY = "uh-consent";

export type Consent = "granted" | "denied" | null;

export function getConsent(): Consent {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: "granted" | "denied") {
  try {
    localStorage.setItem(KEY, v);
  } catch {}
  window.dispatchEvent(new CustomEvent("uh-consent", { detail: v }));
}

/** Открыть плашку согласия снова (ссылка «Настройки аналитики»). */
export function openConsent() {
  window.dispatchEvent(new CustomEvent("uh-consent-open"));
}

type Gtag = (...args: unknown[]) => void;
const gtagFn = (): Gtag | null => {
  if (typeof window === "undefined" || !GA_ID) return null;
  return (window as unknown as { gtag?: Gtag }).gtag ?? null;
};

/**
 * Адрес страницы без личных данных: убираем query (там токены ссылок, ID чатов) и заменяем
 * динамические части пути шаблоном — имя в адресе портфолио, ID попыток, организаций.
 */
export function sanitizePath(path: string): string {
  const p = path.split(/[?#]/)[0] || "/";
  return p
    .replace(/^\/p\/[^/]+/, "/p/[slug]")
    .replace(/^\/mocks\/result\/[^/]+/, "/mocks/result/[id]")
    .replace(/^\/community\/org\/[^/]+/, "/community/org/[id]")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[id]");
}

/** Админку не отслеживаем. */
export const isUntracked = (path: string) => path.startsWith("/admin");

/** Посещение страницы — отправляется всегда (обезличенно, если согласия нет). */
export function pageView(path: string) {
  const g = gtagFn();
  if (!g || isUntracked(path)) return;
  const clean = sanitizePath(path);
  g("event", "page_view", { page_path: clean, page_location: `${location.origin}${clean}`, page_title: document.title });
}

type Params = Record<string, string | number | boolean | undefined>;

/** Событие продукта — только с согласия. Параметры только обезличенные: тип экзамена, режим, способ входа. */
export function track(event: string, params: Params = {}) {
  const g = gtagFn();
  if (!g || getConsent() !== "granted" || isUntracked(location.pathname)) return;
  g("event", event, params);
}
