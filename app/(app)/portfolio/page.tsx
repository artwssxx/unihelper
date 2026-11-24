"use client";

import { track } from "@/lib/analytics";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import NeedProfile from "@/components/NeedProfile";
import PortfolioView from "@/components/portfolio/PortfolioView";
import ProLock from "@/components/ProLock";
import { apiFetch, useAuth, usePlan } from "@/lib/auth";
import { update, type PortfolioBlock, type PortfolioState } from "@/lib/clientStore";
import { t } from "@/lib/i18n/ru";
import { BUILTIN_SECTIONS, PRESET_COLORS, TEMPLATES, buildSnapshot, newBlock, normalizePortfolio } from "@/lib/portfolio";
import { useContent } from "@/lib/useContent";
import { useProfile } from "@/lib/useProfile";

const SHOW = [
  { id: "phone", label: "телефон" },
  { id: "email", label: "email" },
  { id: "city", label: "город" },
  { id: "scores", label: "баллы тестов" },
];

function slugify(name?: string) {
  const map: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ы: "y", э: "e", ю: "yu", я: "ya" };
  const s = (name ?? "student").toLowerCase().split("").map((c) => map[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (s.length >= 3 ? s : `student-${Math.random().toString(36).slice(2, 6)}`).slice(0, 24);
}

export default function PortfolioPage() {
  const { profile, store } = useProfile();
  const { user } = useAuth();
  const { limits } = usePlan();
  const { events } = useContent();
  const [pf, setPf] = useState<PortfolioState | null>(null);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const drag = useRef<string | null>(null);

  useEffect(() => {
    if (!store || pf) return;
    setPf(
      normalizePortfolio(
        store.portfolio ?? {
          slug: slugify(store.contact?.fullName),
          template: "creative",
          visibility: "draft",
          about: "",
          sections: { about: true, projects: true, achievements: true, activities: true, tests: true, contact: true },
          showFields: { phone: false, email: false, city: true, scores: false },
          projects: [],
        },
      ),
    );
  }, [store, pf]);

  const snap = useMemo(() => {
    if (!pf || !profile) return null;
    const attended = Object.entries(store?.events ?? {})
      .filter(([, r]) => r.status === "registered")
      .map(([id]) => events.find((e) => e.id === id)?.title)
      .filter((x): x is string => Boolean(x));
    const tests = [profile.ielts ? `IELTS ${profile.ielts}` : null, profile.sat ? `SAT ${profile.sat}` : null].filter(Boolean).join(" · ") || null;
    return buildSnapshot({
      pf,
      name: store?.contact?.fullName || user?.name || "Ученик",
      majorLabel: t.majors[profile.major],
      city: profile.city,
      achievementsText: profile.achievementsText ?? "",
      activities: attended,
      tests,
      contact: store?.contact ?? null,
      canHideBadge: limits.portfolioHideBadge,
    });
  }, [pf, profile, store, events, user, limits.portfolioHideBadge]);

  if (profile === undefined) return null;
  if (profile === null) return <NeedProfile text="Сайт-портфолио собирается из данных профиля." />;
  if (!pf || !snap) return null;

  const p = normalizePortfolio(pf);
  const set = (patch: Partial<PortfolioState>) => {
    const next = { ...p, ...patch };
    setPf(next);
    update(() => ({ portfolio: next }));
  };
  const minor = profile.grade <= 11;
  const isDemo = Boolean(store?.demo?.active);
  const allTemplates = limits.portfolioTemplates === "all";
  const labelOf = (id: string) => BUILTIN_SECTIONS.find((s) => s.id === id)?.label ?? p.blocks.find((b) => b.id === id)?.title ?? id;
  const move = (id: string, dir: -1 | 1) => {
    const o = [...p.order];
    const i = o.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    set({ order: o });
  };
  const dropOn = (target: string) => {
    const src = drag.current;
    drag.current = null;
    if (!src || src === target) return;
    const o = p.order.filter((x) => x !== src);
    o.splice(o.indexOf(target), 0, src);
    set({ order: o });
  };
  const setBlock = (id: string, patch: Partial<PortfolioBlock>) => set({ blocks: p.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const addBlock = (type: PortfolioBlock["type"]) => {
    const b = newBlock(type);
    set({ blocks: [...p.blocks, b], order: [...p.order, b.id] });
  };
  const removeBlock = (id: string) => set({ blocks: p.blocks.filter((b) => b.id !== id), order: p.order.filter((x) => x !== id) });

  async function draft() {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/portfolio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile }) });
      const j = await res.json();
      set({ about: j.about ?? p.about, projects: j.projects?.length ? j.projects : p.projects });
    } catch {
      setMsg({ ok: false, text: "ИИ сейчас недоступен. Напишите текст сами." });
    } finally {
      setBusy(false);
    }
  }

  async function publish(visibility: "link" | "public") {
    setBusy(true);
    setMsg(null);
    const res = await apiFetch("/api/portfolio", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: p.slug, visibility, parentConsent: consent, minor, snapshot: snap }),
    }).catch(() => null);
    setBusy(false);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      const text = j?.message ?? (res?.status === 401 ? "Войдите, чтобы опубликовать." : res?.status === 409 ? "Этот адрес уже занят — выберите другой." : "Не удалось опубликовать. Проверьте адрес страницы.");
      return setMsg({ ok: false, text });
    }
    track("portfolio_publish", { visibility });
    const url = `${location.origin}${j.path}`;
    set({ visibility, published: { url, at: new Date().toISOString() } });
    setMsg({ ok: true, text: visibility === "public" ? "Опубликовано." : "Опубликовано по ссылке — поисковики страницу не видят." });
  }

  async function unpublish() {
    setBusy(true);
    await apiFetch("/api/portfolio", { method: "DELETE" }).catch(() => null);
    setBusy(false);
    set({ visibility: "draft", published: null });
    setMsg({ ok: true, text: "Страница снята с публикации." });
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="eyebrow">САЙТ-ПОРТФОЛИО</div>
        <h1 className="mt-3 text-[34px] font-extrabold tracking-tight sm:text-[42px]">
          Твоя страница для <span className="serif-accent text-primary">приёмной комиссии</span>
        </h1>
        <p className="mt-2 max-w-[680px] text-body">
          Собирается из профиля. Меняй шаблон и цвет, перетаскивай разделы, добавляй свои блоки и публикуй по ссылке. Контакты и баллы скрыты, пока ты сам их не включишь, — скрытое даже не уходит на сервер.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr] 2xl:grid-cols-[460px_1fr]">
        <section className="min-w-0 space-y-5">
          <Card title="Шаблон и стиль">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATES.map((tp) => {
                const locked = tp.pro && !allTemplates;
                return (
                  <button
                    key={tp.id}
                    className="chip justify-center px-2 py-2.5 text-center text-sm"
                    data-on={p.template === tp.id}
                    disabled={locked}
                    title={locked ? "Шаблон доступен в Pro" : undefined}
                    onClick={() => set({ template: tp.id })}
                  >
                    {tp.label}
                    {locked ? " · Pro" : ""}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Цвет:</span>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Цвет ${c}`}
                  aria-pressed={p.accent === c}
                  className="h-8 w-8 rounded-full border-2"
                  style={{ background: c, borderColor: p.accent === c ? "var(--color-ink)" : "transparent" }}
                  onClick={() => set({ accent: c })}
                />
              ))}
              {allTemplates ? (
                <label className="flex items-center gap-2 text-sm">
                  свой
                  <input type="color" aria-label="Свой цвет" value={p.accent} onChange={(e) => set({ accent: e.target.value })} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent" />
                </label>
              ) : (
                <ProLock compact title="свой цвет" />
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-sm" role="radiogroup" aria-label="Шрифт заголовка">
              {(["sans", "serif"] as const).map((f) => (
                <button key={f} role="radio" aria-checked={p.font === f} className="chip px-3 py-1.5" data-on={p.font === f} onClick={() => set({ font: f })}>
                  {f === "sans" ? "Заголовок: строгий" : <span className="serif-accent">Заголовок: курсив</span>}
                </button>
              ))}
            </div>
            <label className="block text-sm font-semibold">
              Подзаголовок
              <input
                className="input mt-1.5"
                placeholder={`${t.majors[profile.major]} · ${profile.city}`}
                value={p.headline ?? ""}
                maxLength={140}
                onChange={(e) => set({ headline: e.target.value })}
              />
            </label>
          </Card>

          <Card
            title="О себе и проекты"
            action={
              <button className="btn-secondary px-3 py-2 text-sm" onClick={draft} disabled={busy}>
                {busy ? "Пишем…" : "Черновик с ИИ"}
              </button>
            }
          >
            <p className="text-xs text-muted">ИИ пишет только по фактам профиля, без новых достижений и цифр. Проверь и перепиши своими словами.</p>
            <textarea className="input min-h-28" aria-label="О себе" value={p.about} onChange={(e) => set({ about: e.target.value })} placeholder="Пара предложений о себе" />
            {p.projects.map((pr, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-line p-3">
                <input className="input" aria-label="Название проекта" value={pr.title} onChange={(e) => set({ projects: p.projects.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                <textarea className="input min-h-16" aria-label="Описание проекта" value={pr.text} onChange={(e) => set({ projects: p.projects.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                <button className="text-xs font-bold text-red" onClick={() => set({ projects: p.projects.filter((_, j) => j !== i) })}>
                  Удалить проект
                </button>
              </div>
            ))}
            <button className="text-sm font-bold text-primary" onClick={() => set({ projects: [...p.projects, { title: "Новый проект", text: "" }] })}>
              + Проект
            </button>
          </Card>

          <Card title="Разделы и порядок">
            <p className="text-xs text-muted">Перетащи раздел мышкой или двигай стрелками.</p>
            <ul className="space-y-2">
              {p.order.map((id, idx) => {
                const block = p.blocks.find((b) => b.id === id);
                return (
                  <li
                    key={id}
                    draggable
                    onDragStart={() => (drag.current = id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOn(id)}
                    className="rounded-xl border border-line bg-surface-solid p-3"
                  >
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" className="flex-none cursor-grab text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" />
                      </svg>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">
                        {labelOf(id)}
                        {block ? <span className="ml-1.5 text-xs font-semibold text-muted">свой блок</span> : null}
                      </span>
                      <button className="rounded-lg px-2 text-muted disabled:opacity-30" aria-label={`${labelOf(id)} выше`} disabled={idx === 0} onClick={() => move(id, -1)}>
                        ↑
                      </button>
                      <button className="rounded-lg px-2 text-muted disabled:opacity-30" aria-label={`${labelOf(id)} ниже`} disabled={idx === p.order.length - 1} onClick={() => move(id, 1)}>
                        ↓
                      </button>
                      {block ? (
                        <button className="text-xs font-bold text-red" onClick={() => removeBlock(id)}>
                          Удалить
                        </button>
                      ) : (
                        <Toggle label={`Показывать: ${labelOf(id)}`} on={p.sections[id] !== false} onChange={(v) => set({ sections: { ...p.sections, [id]: v } })} />
                      )}
                    </div>
                    {block && (
                      <div className="mt-2.5 space-y-2">
                        <input className="input py-2 text-sm" aria-label="Заголовок блока" value={block.title} onChange={(e) => setBlock(block.id, { title: e.target.value })} />
                        {block.type === "text" && (
                          <textarea className="input min-h-20 text-sm" aria-label="Текст блока" value={block.text ?? ""} onChange={(e) => setBlock(block.id, { text: e.target.value })} />
                        )}
                        {block.type === "skills" && (
                          <input
                            className="input py-2 text-sm"
                            aria-label="Навыки через запятую"
                            value={(block.items ?? []).join(", ")}
                            onChange={(e) => setBlock(block.id, { items: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
                            placeholder="Python, английский B2, публичные выступления"
                          />
                        )}
                        {block.type === "links" && (
                          <div className="space-y-2">
                            {(block.links ?? []).map((l, i) => (
                              <div key={i} className="flex gap-2">
                                <input className="input w-1/3 min-w-0 py-2 text-sm" aria-label="Название ссылки" value={l.label} onChange={(e) => setBlock(block.id, { links: (block.links ?? []).map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                                <input className="input min-w-0 flex-1 py-2 text-sm" aria-label="Адрес ссылки" value={l.url} onChange={(e) => setBlock(block.id, { links: (block.links ?? []).map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                                <button className="px-1 text-muted" aria-label="Убрать ссылку" onClick={() => setBlock(block.id, { links: (block.links ?? []).filter((_, j) => j !== i) })}>
                                  ×
                                </button>
                              </div>
                            ))}
                            <button className="text-xs font-bold text-primary" onClick={() => setBlock(block.id, { links: [...(block.links ?? []), { label: "Сайт", url: "https://" }] })}>
                              + Ссылка
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="font-semibold">Добавить блок:</span>
              <button className="font-bold text-primary" onClick={() => addBlock("text")}>+ Текст</button>
              <button className="font-bold text-primary" onClick={() => addBlock("links")}>+ Ссылки</button>
              <button className="font-bold text-primary" onClick={() => addBlock("skills")}>+ Навыки</button>
            </div>
          </Card>

          <Card title="Приватность">
            {SHOW.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 text-sm font-semibold">
                Показывать {s.label}
                <Toggle label={`Показывать ${s.label}`} on={p.showFields[s.id] ?? false} onChange={(v) => set({ showFields: { ...p.showFields, [s.id]: v } })} />
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 text-sm font-semibold">
              Скрыть «Сделано в UniHelper»
              {limits.portfolioHideBadge ? <Toggle label="Скрыть значок UniHelper" on={Boolean(p.hideBadge)} onChange={(v) => set({ hideBadge: v })} /> : <ProLock compact title="без значка" />}
            </div>
            <p className="text-xs text-muted">Точный адрес не публикуется никогда.</p>
          </Card>

          <Card title="Публикация">
            <label className="block text-sm font-semibold">
              Адрес страницы
              <div className="mt-1.5 flex items-center gap-1 text-sm">
                <span className="text-muted">/p/</span>
                <input className="input py-2" value={p.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 31) })} />
              </div>
              <span className="mt-1 block text-xs font-normal text-muted">Латиница, цифры и дефис, от 3 символов.</span>
            </label>
            {minor && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                Родитель согласен на публикацию (обязательно до 18 лет)
              </label>
            )}
            {isDemo ? (
              <p className="rounded-xl bg-orange-soft px-3 py-2.5 text-sm text-orange-ink-2">В демо страница не публикуется: ученик вымышленный.</p>
            ) : !user ? (
              <Link href="/login?next=/portfolio" className="btn-primary w-full">
                Войти, чтобы опубликовать
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-secondary" disabled={busy || (minor && !consent)} onClick={() => publish("link")}>
                  По ссылке
                </button>
                <button className="btn-primary" disabled={busy || (minor && !consent)} onClick={() => publish("public")}>
                  Публично
                </button>
              </div>
            )}
            {p.published && (
              <div className="rounded-xl bg-green-soft px-3 py-2.5 text-sm">
                <a className="break-all font-bold text-green underline" href={p.published.url} target="_blank" rel="noopener noreferrer">
                  {p.published.url}
                </a>
                <div className="mt-1 flex gap-3">
                  <button className="text-xs font-bold text-green" onClick={() => navigator.clipboard?.writeText(p.published!.url).catch(() => {})}>
                    Скопировать
                  </button>
                  <button className="text-xs font-bold text-red" onClick={unpublish} disabled={busy}>
                    Снять с публикации
                  </button>
                </div>
                <p className="mt-1 text-xs text-body">После правок опубликуй ещё раз — страница обновится.</p>
              </div>
            )}
            {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-green" : "text-red"}`}>{msg.text}</p>}
            <button className="btn-secondary w-full" onClick={() => window.print()}>
              Скачать PDF
            </button>
          </Card>
        </section>

        <section id="pf-preview" aria-label="Предпросмотр портфолио" className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <style>{`@media print { body * { visibility: hidden !important; } #pf-preview, #pf-preview * { visibility: visible !important; } #pf-preview { position: absolute; inset: 0; } }`}</style>
          <PortfolioView s={snap} preview />
        </section>
      </div>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-lg font-extrabold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-6 w-11 flex-none rounded-full transition ${on ? "bg-primary" : "bg-line-2"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
