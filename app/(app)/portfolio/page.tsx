"use client";

import { useEffect, useState } from "react";
import NeedProfile from "@/components/NeedProfile";
import { update, type PortfolioState } from "@/lib/clientStore";
import { EVENTS } from "@/lib/content/events";
import { t } from "@/lib/i18n/ru";
import { useProfile } from "@/lib/useProfile";

const SECTIONS = [
  { id: "about", label: "О себе" },
  { id: "projects", label: "Проекты" },
  { id: "achievements", label: "Достижения и олимпиады" },
  { id: "activities", label: "Активности" },
  { id: "contact", label: "Контактная форма" },
];
const SHOW = [
  { id: "phone", label: "Телефон" },
  { id: "email", label: "Email" },
  { id: "city", label: "Город" },
  { id: "scores", label: "Оценки и баллы тестов" },
];
const TEMPLATES: { id: PortfolioState["template"]; label: string }[] = [
  { id: "minimal", label: "Минимализм" },
  { id: "creative", label: "Креатив" },
  { id: "academic", label: "Академический" },
];

function slugify(name?: string) {
  const map: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ы: "y", э: "e", ю: "yu", я: "ya" };
  return (name ?? "student").toLowerCase().split(/\s+/)[0].split("").map((c) => map[c] ?? c).join("").replace(/[^a-z0-9-]/g, "") || "student";
}

export default function PortfolioPage() {
  const { profile, store } = useProfile();
  const [pf, setPf] = useState<PortfolioState | null>(null);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!store || pf) return;
    setPf(
      store.portfolio ?? {
        slug: slugify(store.contact?.fullName),
        template: "minimal",
        visibility: "draft",
        about: "",
        sections: { about: true, projects: true, achievements: true, activities: true, contact: false },
        showFields: { phone: false, email: false, city: false, scores: false },
        projects: [],
      },
    );
  }, [store, pf]);

  if (profile === undefined || !pf) return profile === null ? <NeedProfile text="Сайт-портфолио собирается из данных профиля." /> : null;
  if (profile === null) return <NeedProfile text="Сайт-портфолио собирается из данных профиля." />;

  const set = (patch: Partial<PortfolioState>) => {
    const next = { ...pf, ...patch };
    setPf(next);
    update(() => ({ portfolio: next }));
  };
  const minor = profile.grade <= 11;

  async function draft() {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/portfolio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile }) });
      const j = await res.json();
      set({ about: j.about ?? pf!.about, projects: j.projects?.length ? j.projects : pf!.projects });
    } finally {
      setBusy(false);
    }
  }

  const attended = Object.entries(store?.events ?? {}).filter(([, r]) => r.status === "registered").map(([id]) => EVENTS.find((e) => e.id === id)).filter(Boolean);

  return (
    <div className="space-y-6">
      <style>{`@media print { body * { visibility: hidden !important; } #pf-preview, #pf-preview * { visibility: visible !important; } #pf-preview { position: absolute; inset: 0; } }`}</style>
      <section>
        <div className="eyebrow">САЙТ-ПОРТФОЛИО</div>
        <h1 className="mt-3 text-[34px] font-extrabold tracking-tight sm:text-[42px]">Твоя страница для приёмной комиссии</h1>
        <p className="mt-2 max-w-[680px] text-body">Собирается из профиля за минуту. По умолчанию скрыта и не индексируется; контакты, оценки и баллы скрыты, пока ты сам их не включишь.</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="space-y-5">
          <div className="card space-y-4">
            <h2 className="m-0 text-lg font-extrabold">Шаблон</h2>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map((tp) => (
                <button key={tp.id} className="chip px-2 py-2.5 text-center text-sm" data-on={pf.template === tp.id} onClick={() => set({ template: tp.id })}>{tp.label}</button>
              ))}
            </div>
          </div>
          <div className="card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 text-lg font-extrabold">О себе и проекты</h2>
              <button className="btn-secondary px-3 py-2 text-sm" onClick={draft} disabled={busy}>{busy ? "Пишем…" : "Написать с ИИ"}</button>
            </div>
            <p className="text-xs text-muted">ИИ пишет только по фактам профиля, без новых достижений и цифр. Проверь и отредактируй перед публикацией.</p>
            <textarea className="input min-h-28" aria-label="О себе" value={pf.about} onChange={(e) => set({ about: e.target.value })} placeholder="Пара предложений о себе" />
            {pf.projects.map((p, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-line p-3">
                <input className="input" aria-label="Название проекта" value={p.title} onChange={(e) => set({ projects: pf.projects.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                <textarea className="input min-h-16" aria-label="Описание проекта" value={p.text} onChange={(e) => set({ projects: pf.projects.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                <button className="text-xs font-bold text-red" onClick={() => set({ projects: pf.projects.filter((_, j) => j !== i) })}>Удалить</button>
              </div>
            ))}
            <button className="text-sm font-bold text-primary" onClick={() => set({ projects: [...pf.projects, { title: "Новый проект", text: "" }] })}>+ Добавить проект</button>
          </div>
          <div className="card space-y-3">
            <h2 className="m-0 text-lg font-extrabold">Разделы</h2>
            {SECTIONS.map((s) => (
              <Toggle key={s.id} label={s.label} on={pf.sections[s.id] ?? false} onChange={(v) => set({ sections: { ...pf.sections, [s.id]: v } })} />
            ))}
          </div>
          <div className="card space-y-3">
            <h2 className="m-0 text-lg font-extrabold">Приватность</h2>
            {SHOW.map((s) => (
              <Toggle key={s.id} label={`Показывать: ${s.label.toLowerCase()}`} on={pf.showFields[s.id] ?? false} onChange={(v) => set({ showFields: { ...pf.showFields, [s.id]: v } })} />
            ))}
            <p className="text-xs text-muted">Точный адрес не публикуется никогда.</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Доступ">
              {(["draft", "link", "public"] as const).map((v) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={pf.visibility === v}
                  className="chip px-2 py-2.5 text-center text-sm"
                  data-on={pf.visibility === v}
                  disabled={v !== "draft" && minor && !consent}
                  onClick={() => set({ visibility: v })}
                >
                  {v === "draft" ? "Черновик" : v === "link" ? "По ссылке" : "Публичный"}
                </button>
              ))}
            </div>
            {minor && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                Родитель согласен на публикацию (обязательно до 18 лет)
              </label>
            )}
            <p className="rounded-xl bg-bg px-3 py-2 text-xs text-muted">
              Адрес: unihelper.uz/p/{pf.slug} (домен уточняется). Публикация по ссылке заработает, когда подключим базу; сейчас доступны предпросмотр и PDF.
            </p>
            <button className="btn-primary w-full" onClick={() => window.print()}>Скачать PDF</button>
          </div>
        </section>

        <section id="pf-preview" aria-label="Предпросмотр портфолио">
          <Preview pf={pf} name={store?.contact?.fullName ?? "Ученик"} profile={profile} contact={store?.contact} attended={attended.map((e) => e!.title)} />
        </section>
      </div>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
      {label}
      <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-6 w-11 rounded-full transition ${on ? "bg-primary" : "bg-line-2"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

function Preview({ pf, name, profile, contact, attended }: {
  pf: PortfolioState; name: string; profile: NonNullable<ReturnType<typeof useProfile>["profile"]>;
  contact?: { phone: string; email?: string }; attended: string[];
}) {
  const theme = {
    minimal: { wrap: "bg-white text-[#111834]", hero: "bg-white", accent: "text-primary", card: "border border-line" },
    creative: { wrap: "bg-[#FFF8F3] text-[#111834]", hero: "bg-orange text-white", accent: "text-orange-ink", card: "bg-white shadow-sm" },
    academic: { wrap: "bg-white text-[#111834] font-serif", hero: "bg-inv text-white", accent: "text-primary-ink", card: "border-l-0 border-t-4 border-primary bg-bg" },
  }[pf.template];
  const s = pf.sections;
  const achievements = profile.achievementsText.split(/[,;\n]/).map((x) => x.trim()).filter((x) => x.length > 3);
  return (
    <article className={`overflow-hidden rounded-[26px] border border-line ${theme.wrap}`}>
      <header className={`px-8 py-10 ${theme.hero}`}>
        <p className="text-sm opacity-80">{pf.visibility === "draft" ? "Черновик · не опубликовано" : pf.visibility === "link" ? "Доступ по ссылке · noindex" : "Публичная страница"}</p>
        <h2 className="mt-2 text-4xl font-extrabold tracking-tight">{name}</h2>
        <p className="mt-2 text-lg opacity-90">
          {t.majors[profile.major]}
          {pf.showFields.city ? ` · ${profile.city}` : ""}
        </p>
      </header>
      <div className="space-y-6 px-8 py-8">
        {s.about && pf.about && (
          <section>
            <h3 className={`text-sm font-extrabold tracking-[0.1em] ${theme.accent}`}>О СЕБЕ</h3>
            <p className="mt-2 leading-relaxed">{pf.about}</p>
          </section>
        )}
        {s.projects && pf.projects.length > 0 && (
          <section>
            <h3 className={`text-sm font-extrabold tracking-[0.1em] ${theme.accent}`}>ПРОЕКТЫ</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {pf.projects.map((p, i) => (
                <div key={i} className={`rounded-2xl p-4 ${theme.card}`}>
                  <div className="font-bold">{p.title}</div>
                  {p.text && <p className="mt-1 text-sm opacity-80">{p.text}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {s.achievements && achievements.length > 0 && (
          <section>
            <h3 className={`text-sm font-extrabold tracking-[0.1em] ${theme.accent}`}>ДОСТИЖЕНИЯ</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">{achievements.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </section>
        )}
        {s.activities && attended.length > 0 && (
          <section>
            <h3 className={`text-sm font-extrabold tracking-[0.1em] ${theme.accent}`}>АКТИВНОСТИ</h3>
            <ul className="mt-2 space-y-1">{attended.map((a) => <li key={a}>{a} <span className="text-xs opacity-70">· запись через Unihelper</span></li>)}</ul>
          </section>
        )}
        {pf.showFields.scores && (
          <section>
            <h3 className={`text-sm font-extrabold tracking-[0.1em] ${theme.accent}`}>ТЕСТЫ</h3>
            <p className="mt-2">{[profile.ielts ? `IELTS ${profile.ielts}` : null, profile.sat ? `SAT ${profile.sat}` : null].filter(Boolean).join(" · ") || "Официальных результатов пока нет"}</p>
          </section>
        )}
        {(s.contact || pf.showFields.phone || pf.showFields.email) && (
          <section>
            <h3 className={`text-sm font-extrabold tracking-[0.1em] ${theme.accent}`}>КОНТАКТ</h3>
            {pf.showFields.phone && contact?.phone && <p className="mt-2">{contact.phone}</p>}
            {pf.showFields.email && contact?.email && <p>{contact.email}</p>}
            {s.contact && <p className="mt-2 text-sm opacity-80">Форма обратной связи: сообщения придут ученику в Telegram, его контакты не показываются.</p>}
          </section>
        )}
      </div>
      <footer className="border-t border-line px-8 py-4 text-xs opacity-70">Сделано в Unihelper</footer>
    </article>
  );
}
