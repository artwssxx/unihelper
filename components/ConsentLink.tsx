"use client";

import { GA_ID, openConsent } from "@/lib/analytics";

/** «Настройки аналитики» — снова показать плашку согласия. */
export default function ConsentLink({ className = "" }: { className?: string }) {
  if (!GA_ID) return null;
  return (
    <button type="button" className={className} onClick={openConsent}>
      Настройки аналитики
    </button>
  );
}
