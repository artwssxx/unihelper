// Общие функции мини-приложения для браузера (без node:crypto).

/** Внутренний путь сайта: внешние и протокольные адреса заменяем на главную кабинета. */
export function safePath(to: string | null | undefined): string {
  if (!to || !to.startsWith("/") || to.startsWith("//") || to.includes("\\")) return "/dashboard";
  return to.slice(0, 200);
}
