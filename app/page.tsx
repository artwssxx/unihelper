import Link from "next/link";
import { t } from "@/lib/i18n/ru";

export default function Landing() {
  return (
    <div className="space-y-10 pt-6">
      <section className="space-y-5">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{t.landing.title}</h1>
        <p className="text-lg text-muted">{t.landing.subtitle}</p>
        <Link href="/quiz" className="btn-primary w-full sm:w-auto">{t.landing.cta}</Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {t.landing.benefits.map((b) => (
          <div key={b.title} className="card space-y-2">
            <h2 className="font-semibold">{b.title}</h2>
            <p className="text-sm text-muted">{b.text}</p>
          </div>
        ))}
      </section>
      <p className="text-sm text-muted">{t.landing.price}</p>
    </div>
  );
}
