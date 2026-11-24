"use client";

import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { update, useStore, type EventRegistration } from "@/lib/clientStore";
import { TYPE_LABEL, rankEvents, type EventItem } from "@/lib/content/events";
import { useContent } from "@/lib/useContent";

const FIELDS = [
  { id: "name", label: "Имя" },
  { id: "phone", label: "Телефон" },
  { id: "grade", label: "Класс" },
  { id: "school", label: "Город" },
];

export default function EventsPage() {
  const store = useStore();
  const { events: EVENTS } = useContent();
  const [type, setType] = useState<"all" | EventItem["type"]>("all");
  const [place, setPlace] = useState<"all" | "online" | "offline">("all");
  const [open, setOpen] = useState<EventItem | null>(null);
  const [ticketFor, setTicketFor] = useState<EventItem | null>(null);

  const list = useMemo(() => {
    if (!store) return [];
    const ranked = rankEvents(EVENTS, store.profile?.major, store.profile?.city);
    return ranked.filter((e) => (type === "all" || e.type === type) && (place === "all" || (place === "online") === e.online));
  }, [store, type, place, EVENTS]);

  if (!store) return null;
  const regs = store.events ?? {};

  return (
    <div className="space-y-6">
      <section>
        <div className="eyebrow">ИВЕНТЫ</div>
        <h1 className="mt-3 text-[34px] font-extrabold tracking-tight sm:text-[42px]">Олимпиады, волонтёрство, летние школы</h1>
        <p className="mt-2 max-w-[680px] text-body">
          Подобраны под твою специальность и город. Запись в один клик — если организатор подключён к Unihelper. Участие, подтверждённое организатором, само попадает в портфолио.
        </p>
      </section>

      <p className="rounded-2xl border border-dashed border-line-2 bg-surface px-5 py-3 text-sm text-body">
        Сейчас в ленте <b>демонстрационные примеры</b> (помечены «[Пример]»). Реальные ивенты добавят организаторы через «Разместить ивент» после модерации.
      </p>

      <div className="flex flex-wrap gap-2">
        <select className="input w-auto" aria-label="Тип ивента" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="all">Все типы</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input w-auto" aria-label="Формат" value={place} onChange={(e) => setPlace(e.target.value as typeof place)}>
          <option value="all">Онлайн и офлайн</option>
          <option value="online">Онлайн</option>
          <option value="offline">Офлайн</option>
        </select>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {list.map((e) => {
          const reg = regs[e.id];
          const date = new Date(e.startsAt);
          const full = e.registrationMode === "unihelper" && e.registered >= e.capacity;
          return (
            <article key={e.id} className="card flex gap-4">
              <div className={`flex h-14 w-[52px] flex-none flex-col items-center justify-center rounded-xl ${e.online ? "bg-orange-soft text-orange-ink-2" : "bg-primary-soft text-primary-ink"}`}>
                <span className="text-lg font-extrabold">{String(date.getDate()).padStart(2, "0")}</span>
                <span className="text-[11px] font-bold uppercase">{date.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="pill bg-bg text-muted">{TYPE_LABEL[e.type]}</span>
                  {e.isPromoted && <span className="pill bg-orange-soft text-orange-ink-2">реклама</span>}
                </div>
                <h2 className="mt-2 text-lg font-extrabold">{e.title}</h2>
                <p className="text-[13px] text-muted">
                  {e.organizer} · {e.location}
                  {reg && reg.status !== "cancelled" && (
                    <> · <span className="font-bold text-green">{reg.status === "waitlist" ? "в листе ожидания" : "вы записаны"}</span></>
                  )}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-body">{e.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {e.registrationMode === "external" ? (
                    <a href={e.externalUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary py-2.5 text-sm">Регистрация на сайте организатора ↗</a>
                  ) : reg && reg.status !== "cancelled" ? (
                    <>
                      <button className="btn-primary py-2.5 text-sm" onClick={() => setTicketFor(e)}>Мой билет</button>
                      <button
                        className="btn-secondary py-2.5 text-sm"
                        onClick={() => update((s) => ({ events: { ...(s.events ?? {}), [e.id]: { ...reg, status: "cancelled" } } }))}
                      >
                        Отменить запись
                      </button>
                    </>
                  ) : (
                    <button className="btn-primary py-2.5 text-sm" onClick={() => setOpen(e)}>
                      {full ? "В лист ожидания" : "Записаться"}
                    </button>
                  )}
                  {e.registrationMode === "unihelper" && (
                    <span className="self-center text-xs text-muted">
                      {full ? "мест нет" : `осталось мест: ${e.capacity - e.registered}`}
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-xl font-extrabold">Организуете ивент?</h2>
          <p className="mt-1 text-sm text-body">Школы, клубы, вузы и НКО размещают ивенты бесплатно: запись, лист ожидания, отметка присутствия по QR.</p>
        </div>
        <button className="btn-secondary" disabled title="Форма для организаторов появится вместе с кабинетом организатора">
          Разместить ивент — скоро
        </button>
      </section>

      {open && <RegisterModal e={open} store={store} onClose={() => setOpen(null)} onDone={() => { setTicketFor(open); setOpen(null); }} />}
      {ticketFor && regs[ticketFor.id] && <Ticket e={ticketFor} reg={regs[ticketFor.id]} onClose={() => setTicketFor(null)} />}
    </div>
  );
}

function RegisterModal({ e, store, onClose, onDone }: { e: EventItem; store: NonNullable<ReturnType<typeof useStore>>; onClose: () => void; onDone: () => void }) {
  const [answers, setAnswers] = useState<string[]>(e.questions.map(() => ""));
  const [shared, setShared] = useState<string[]>(["name"]);
  const [consent, setConsent] = useState(false);
  const full = e.registered >= e.capacity;

  function submit() {
    const reg: EventRegistration = {
      status: full ? "waitlist" : "registered",
      ticket: crypto.randomUUID(),
      sharedFields: shared,
      at: new Date().toISOString(),
    };
    update((s) => ({ events: { ...(s.events ?? {}), [e.id]: reg } }));
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,14,28,.5)] p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal aria-labelledby="regT" className="card w-full max-w-md space-y-4" onClick={(ev) => ev.stopPropagation()}>
        <h2 id="regT" className="text-xl font-extrabold">{full ? "Лист ожидания" : "Запись"}: {e.title}</h2>
        {full && <p className="text-sm text-body">Мест нет. Если кто-то отменит запись, вы автоматически перейдёте в список участников.</p>}
        {e.questions.map((q, i) => (
          <label key={q} className="block text-sm font-semibold">
            {q}
            <input className="input mt-1.5" value={answers[i]} onChange={(ev) => setAnswers(answers.map((a, j) => (j === i ? ev.target.value : a)))} />
          </label>
        ))}
        <fieldset>
          <legend className="text-sm font-semibold">Что передать организатору</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {FIELDS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="chip px-3 py-2 text-sm"
                data-on={shared.includes(f.id)}
                aria-pressed={shared.includes(f.id)}
                onClick={() => setShared(shared.includes(f.id) ? shared.filter((x) => x !== f.id) : [...shared, f.id])}
              >
                {f.label}
              </button>
            ))}
          </div>
          {!store.contact && <p className="mt-2 text-xs text-muted">Контактов в профиле нет — передастся только то, что вы выберете и укажете позже.</p>}
        </fieldset>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={consent} onChange={(ev) => setConsent(ev.target.checked)} />
          <span>Согласен(на) передать выбранные данные организатору «{e.organizer}».</span>
        </label>
        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Отмена</button>
          <button className="btn-primary flex-1" disabled={!consent} onClick={submit}>{full ? "Встать в очередь" : "Записаться"}</button>
        </div>
      </div>
    </div>
  );
}

function Ticket({ e, reg, onClose }: { e: EventItem; reg: EventRegistration; onClose: () => void }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(`unihelper:ticket:${e.id}:${reg.ticket}`, { type: "svg", margin: 1, color: { dark: "#0E1A3A", light: "#FFFFFF" } }).then(setSvg);
  }, [e.id, reg.ticket]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,14,28,.5)] p-4" onClick={onClose}>
      <div role="dialog" aria-modal aria-labelledby="tT" className="card w-full max-w-sm space-y-4 text-center" onClick={(ev) => ev.stopPropagation()}>
        <h2 id="tT" className="text-xl font-extrabold">{reg.status === "waitlist" ? "Вы в листе ожидания" : "Ваш билет"}</h2>
        <p className="text-sm text-body">{e.title} · {new Date(e.startsAt).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
        {reg.status === "registered" && (
          <div className="mx-auto w-48" role="img" aria-label="QR-код билета для отметки присутствия" dangerouslySetInnerHTML={{ __html: svg }} />
        )}
        <p className="text-xs text-muted">Покажите QR организатору на входе. Напоминания в Telegram за день и за час — когда подключим бота.</p>
        <button className="btn-primary w-full" onClick={onClose}>Готово</button>
      </div>
    </div>
  );
}
