"use client";

import { setLang, useLang } from "@/lib/i18n/lang";
import { LANGS } from "@/lib/i18n/translate";

/** RU / UZ / EN — переключает язык всего сайта. Подписи не переводятся (translate="no"). */
export default function LangSwitch({ className = "" }: { className?: string }) {
  const lang = useLang();
  return (
    <div role="group" aria-label="Язык / Til / Language" translate="no" className={`flex h-11 items-center rounded-xl border border-line bg-surface p-1 ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          aria-pressed={lang === l.id}
          title={l.name}
          onClick={() => setLang(l.id)}
          className={`h-full rounded-lg px-2.5 text-xs font-extrabold ${lang === l.id ? "bg-primary text-white" : "text-muted hover:text-ink"}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
