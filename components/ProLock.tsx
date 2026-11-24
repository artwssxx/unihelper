"use client";

import Link from "next/link";

/** Плашка «доступно в Pro» с переходом к тарифам. */
export default function ProLock({ title, text, compact = false }: { title: string; text?: string; compact?: boolean }) {
  if (compact) {
    return (
      <Link href="/pricing" className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold text-white" style={{ background: "var(--grad)" }}>
        PRO · {title}
      </Link>
    );
  }
  return (
    <div className="rounded-2xl border border-primary-soft-2 bg-primary-soft px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-extrabold text-primary-ink">
            <span className="mr-2 rounded-md px-1.5 py-0.5 text-[11px] text-white" style={{ background: "var(--grad)" }}>PRO</span>
            {title}
          </div>
          {text && <p className="mt-1 text-sm text-body">{text}</p>}
        </div>
        <Link href="/pricing" className="btn-primary py-2.5 text-sm">Открыть в Pro</Link>
      </div>
    </div>
  );
}
