"use client";

import { track } from "@/lib/analytics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, Avatar, Chips, personMeta, ReportButton, SafetyNote, timeAgo } from "@/components/community/ui";
import * as I from "@/components/icons";
import { useAuth, usePlan } from "@/lib/auth";
import { ORG_KINDS, plural, POST_KINDS, type ChatSummary, type Org, type Post, type PostKind, type PublicProfile } from "@/lib/community";
import { MAJORS } from "@/lib/profileConst";
import { t } from "@/lib/i18n/ru";
import { useProfile } from "@/lib/useProfile";

type Me = { profile: (PublicProfile & { visible: boolean; hiddenByAdmin: boolean }) | null; blocked: string[] };
type Tab = "posts" | "people" | "orgs";

export default function CommunityPage() {
  const { ready, enabled, user } = useAuth();
  const { store } = useProfile();
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("posts");
  const [editing, setEditing] = useState(false);
  const [unread, setUnread] = useState(0);

  const loadMe = useCallback(async () => {
    const r = await api<Me>("/api/community/me");
    if (r.ok) setMe(r.data);
    else setErr(r.data.message ?? "Комьюнити сейчас недоступно.");
  }, []);

  useEffect(() => {
    if (!user) return;
    loadMe();
    api<{ items: ChatSummary[] }>("/api/community/chats").then((r) => r.ok && setUnread(r.data.items.reduce((s, c) => s + c.unread, 0)));
  }, [user, loadMe]);

  if (!ready) return null;
  if (store?.demo?.active || !enabled || !user) return <Intro demo={Boolean(store?.demo?.active)} />;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">КОМЬЮНИТИ</div>
          <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[42px]">
            Найди <span className="serif-accent text-primary">команду</span> для проекта
          </h1>
          <p className="mt-2 max-w-[640px] text-body">Школьники и студенты, которые тоже поступают за рубеж: проекты, олимпиадные команды, клубы и волонтёрство.</p>
        </div>
        <Link href="/community/chats" className="btn-secondary relative">
          <I.Chat size={18} /> Чаты
          {unread > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-6 rounded-full bg-orange px-1.5 text-center text-xs font-extrabold leading-6 text-white">{unread}</span>}
        </Link>
      </section>

      {err && <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-orange-ink-2">{err}</p>}
      {me && (!me.profile || editing) ? (
        <ProfileForm me={me} onSaved={() => { setEditing(false); loadMe(); }} onCancel={me.profile ? () => setEditing(false) : undefined} />
      ) : me?.profile ? (
        <div className="card flex flex-wrap items-center gap-4">
          <Avatar name={me.profile.name} size={48} />
          <div className="min-w-0 flex-1">
            <div translate="no" className="font-extrabold">{me.profile.name}</div>
            <div className="text-sm text-muted">{personMeta(me.profile) || "Карточка участника"}</div>
            {me.profile.hiddenByAdmin && <div className="mt-1 text-sm font-semibold text-red">Карточка скрыта модератором.</div>}
          </div>
          <span className={`pill ${me.profile.visible ? "bg-green-soft text-green" : "bg-line-3 text-muted"}`}>{me.profile.visible ? "видна в поиске" : "скрыта из поиска"}</span>
          <button className="btn-secondary px-4 py-2 text-sm" onClick={() => setEditing(true)}>Изменить</button>
        </div>
      ) : null}

      <SafetyNote />

      <div className="tabs-row" role="tablist" aria-label="Разделы комьюнити">
        {([["posts", "Проекты и вопросы"], ["people", "Люди"], ["orgs", "Организации"]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className="chip whitespace-nowrap px-4 py-2" data-on={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {me && (tab === "posts" ? <Posts hasProfile={Boolean(me.profile)} /> : tab === "people" ? <People /> : <Orgs hasProfile={Boolean(me.profile)} />)}
    </div>
  );
}

function Intro({ demo }: { demo: boolean }) {
  return (
    <div className="space-y-6">
      <section>
        <div className="eyebrow">КОМЬЮНИТИ</div>
        <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[42px]">
          Найди <span className="serif-accent text-primary">команду</span> для проекта
        </h1>
        <p className="mt-2 max-w-[640px] text-body">Проекты для портфолио, олимпиадные команды, клубы и волонтёрство — с теми, кто тоже поступает за рубеж.</p>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Ищу команду", "Опиши идею и кого не хватает — программиста, дизайнера, спикера. Тебе напишут прямо здесь."],
          ["Люди", "Поиск по навыкам и интересам: Python, MUN, робототехника, волонтёрство."],
          ["Организации и чаты", "Клубы и команды со своим общим чатом. Личные сообщения — внутри сайта, без обмена телефонами."],
        ].map(([title, text]) => (
          <div key={title} className="card">
            <div className="font-extrabold">{title}</div>
            <p className="mt-1.5 text-sm text-body">{text}</p>
          </div>
        ))}
      </div>
      {demo ? (
        <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-orange-ink-2">В демо комьюнити не показывается: ученик вымышленный, а участники — настоящие люди. Выйдите из демо и войдите в аккаунт.</p>
      ) : (
        <Link href="/login?next=/community" className="btn-primary">Войти, чтобы участвовать</Link>
      )}
    </div>
  );
}

function ProfileForm({ me, onSaved, onCancel }: { me: Me; onSaved: () => void; onCancel?: () => void }) {
  const { profile: local, store } = useProfile();
  const { user } = useAuth();
  const p = me.profile;
  const first = (store?.contact?.fullName || user?.name || "").split(/\s+/);
  const [f, setF] = useState({
    name: p?.name ?? (first[0] ? `${first[0]}${first[1] ? ` ${first[1][0]}.` : ""}` : ""),
    grade: p?.grade ?? local?.grade ?? null,
    city: p?.city ?? local?.city ?? "",
    major: p?.major ?? local?.major ?? "",
    bio: p?.bio ?? "",
    skills: (p?.skills ?? []).join(", "),
    lookingFor: p?.lookingFor ?? "",
    visible: p ? me.profile!.visible : true,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Профиль из анкеты может загрузиться позже формы — дозаполняем пустые поля.
  useEffect(() => {
    if (p || !local) return;
    setF((prev) => ({ ...prev, grade: prev.grade ?? local.grade, city: prev.city || local.city, major: prev.major || local.major }));
  }, [p, local]);
  async function save() {
    setBusy(true);
    const r = await api("/api/community/me", {
      method: "PUT",
      json: { ...f, city: f.city || null, major: f.major || null, skills: f.skills.split(",").map((x) => x.trim()).filter(Boolean) },
    });
    setBusy(false);
    if (r.ok) onSaved();
    else setMsg(r.data.message ?? "Не удалось сохранить.");
  }
  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">{p ? "Моя карточка" : "Карточка участника"}</h2>
        <p className="mt-1 text-sm text-body">Так тебя увидят другие. Достаточно имени и первой буквы фамилии. Телефон и почта здесь не нужны и не показываются.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Имя<input className="input mt-1.5" value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Азиз К." /></label>
        <label className="block text-sm font-semibold">Город<input className="input mt-1.5" value={f.city ?? ""} maxLength={60} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
        <label className="block text-sm font-semibold">
          Класс или курс
          <select className="input mt-1.5" value={f.grade ?? ""} onChange={(e) => setF({ ...f, grade: e.target.value ? Number(e.target.value) : null })}>
            <option value="">не указывать</option>
            {[8, 9, 10, 11].map((g) => <option key={g} value={g}>{g} класс</option>)}
            <option value={12}>1 курс</option>
            <option value={13}>2 курс</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Направление
          <select className="input mt-1.5" value={f.major ?? ""} onChange={(e) => setF({ ...f, major: e.target.value })}>
            <option value="">не указывать</option>
            {MAJORS.map((m) => <option key={m} value={m}>{t.majors[m]}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold sm:col-span-2">Навыки через запятую<input className="input mt-1.5" value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} placeholder="Python, дизайн в Figma, дебаты, английский B2" /></label>
        <label className="block text-sm font-semibold sm:col-span-2">Кого или что ищу<input className="input mt-1.5" value={f.lookingFor} maxLength={200} onChange={(e) => setF({ ...f, lookingFor: e.target.value })} placeholder="Команду на хакатон, партнёра для подготовки к IELTS…" /></label>
        <label className="block text-sm font-semibold sm:col-span-2">О себе<textarea className="input mt-1.5 min-h-20" value={f.bio} maxLength={600} onChange={(e) => setF({ ...f, bio: e.target.value })} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4" checked={f.visible} onChange={(e) => setF({ ...f, visible: e.target.checked })} />
        Показывать меня в поиске людей
      </label>
      {msg && <p className="text-sm font-semibold text-red">{msg}</p>}
      <div className="flex gap-2">
        {onCancel && <button className="btn-secondary" onClick={onCancel}>Отмена</button>}
        <button className="btn-primary" disabled={busy || f.name.trim().length < 2} onClick={save}>{busy ? "Сохраняем…" : "Сохранить"}</button>
      </div>
    </div>
  );
}

function useStartChat() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const start = async (userId: string) => {
    setErr(null);
    const r = await api<{ id: string }>("/api/community/chats", { method: "POST", json: { userId } });
    if (r.ok) router.push(`/community/chats?c=${r.data.id}`);
    else setErr(r.data.message ?? "Не удалось открыть чат.");
  };
  return { start, err };
}

function Posts({ hasProfile }: { hasProfile: boolean }) {
  const { limits } = usePlan();
  const [items, setItems] = useState<Post[] | null>(null);
  const [kind, setKind] = useState<PostKind | "all">("all");
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ kind: "team" as PostKind, title: "", body: "", roles: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { start, err } = useStartChat();

  const load = useCallback(async () => {
    const r = await api<{ items: Post[] }>(`/api/community/posts${kind === "all" ? "" : `?kind=${kind}`}`);
    setItems(r.ok ? r.data.items : []);
  }, [kind]);
  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setMsg(null);
    setBusy(true);
    const r = await api("/api/community/posts", { method: "POST", json: { ...f, roles: f.roles.split(",").map((x) => x.trim()).filter(Boolean) } });
    setBusy(false);
    if (!r.ok) return setMsg(r.data.message ?? "Не удалось опубликовать.");
    track("community_post", { kind: f.kind });
    setCreating(false);
    setF({ kind: "team", title: "", body: "", roles: "" });
    load();
  }
  async function setStatus(id: string, status: "open" | "closed") {
    await api(`/api/community/posts/${id}`, { method: "PATCH", json: { status } });
    load();
  }
  async function remove(id: string) {
    await api(`/api/community/posts/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[{ id: "all", label: "Все" } as const, ...POST_KINDS].map((k) => (
            <button key={k.id} className="chip px-3 py-1.5 text-sm" data-on={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</button>
          ))}
        </div>
        {hasProfile && !creating && <button className="btn-primary px-4 py-2.5 text-sm" onClick={() => setCreating(true)}>+ Новый проект или вопрос</button>}
      </div>

      {creating && (
        <div className="card space-y-3">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Тип публикации">
            {POST_KINDS.map((k) => (
              <button key={k.id} role="radio" aria-checked={f.kind === k.id} className="chip px-3 py-1.5 text-sm" data-on={f.kind === k.id} onClick={() => setF({ ...f, kind: k.id })}>{k.label}</button>
            ))}
          </div>
          <input className="input" placeholder={f.kind === "team" ? "Например: приложение для школьной библиотеки" : f.kind === "study" ? "Например: готовимся к IELTS вместе, цель 7.0" : "Твой вопрос"} value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} aria-label="Заголовок" />
          <textarea className="input min-h-28" placeholder="Что за идея, что уже есть, сколько времени нужно в неделю" value={f.body} maxLength={2000} onChange={(e) => setF({ ...f, body: e.target.value })} aria-label="Описание" />
          {f.kind !== "question" && <input className="input" placeholder="Кого ищем, через запятую: frontend, дизайнер, спикер" value={f.roles} onChange={(e) => setF({ ...f, roles: e.target.value })} aria-label="Кого ищем" />}
          <p className="text-xs text-muted">Открытых проектов на твоём тарифе: до {limits.communityOpenPosts}.</p>
          {msg && <p className="text-sm font-semibold text-red">{msg}</p>}
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setCreating(false)}>Отмена</button>
            <button className="btn-primary" disabled={busy || f.title.trim().length < 4 || !f.body.trim()} onClick={create}>{busy ? "Публикуем…" : "Опубликовать"}</button>
          </div>
        </div>
      )}
      {!hasProfile && <p className="text-sm text-muted">Чтобы публиковать и писать авторам, заполни карточку участника выше.</p>}
      {err && <p className="text-sm font-semibold text-red">{err}</p>}

      {items === null ? (
        <p className="text-muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <div className="card text-center text-body">Пока пусто. Начни первым — опиши проект, и к тебе присоединятся.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((p) => (
            <article key={p.id} className={`card flex flex-col gap-3 ${p.status === "closed" ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill bg-primary-soft text-primary-ink">{POST_KINDS.find((k) => k.id === p.kind)?.label}</span>
                {p.status === "closed" && <span className="pill bg-line-3 text-muted">набор закрыт</span>}
                <span className="text-xs text-muted">{timeAgo(p.createdAt)}</span>
              </div>
              <h3 translate="no" className="text-lg font-extrabold leading-snug">{p.title}</h3>
              <p translate="no" className="whitespace-pre-line text-sm text-body">{p.body}</p>
              {p.roles.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-muted">ИЩЕМ</div>
                  <Chips items={p.roles} tone="primary" />
                </div>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-line-3 pt-3">
                {p.author && <Avatar name={p.author.name} size={32} />}
                <div className="min-w-0 flex-1 text-sm">
                  <div className="truncate font-bold">{p.author?.name ?? "Участник"}</div>
                  <div className="truncate text-xs text-muted">{p.author ? personMeta(p.author) : ""}</div>
                </div>
                {p.mine ? (
                  <>
                    <button className="text-xs font-bold text-primary" onClick={() => setStatus(p.id, p.status === "open" ? "closed" : "open")}>{p.status === "open" ? "Закрыть набор" : "Открыть снова"}</button>
                    <button className="text-xs font-bold text-red" onClick={() => remove(p.id)}>Удалить</button>
                  </>
                ) : (
                  <>
                    {hasProfile && p.author && <button className="btn-primary px-3.5 py-2 text-sm" onClick={() => start(p.author!.userId)}>Написать</button>}
                    <ReportButton type="post" id={p.id} />
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function People() {
  const [q, setQ] = useState("");
  const [major, setMajor] = useState("");
  const [items, setItems] = useState<(PublicProfile & { me: boolean })[] | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const { start, err } = useStartChat();

  useEffect(() => {
    const tm = setTimeout(async () => {
      const r = await api<{ items: (PublicProfile & { me: boolean })[] }>(`/api/community/people?q=${encodeURIComponent(q)}&major=${encodeURIComponent(major)}`);
      setItems(r.ok ? r.data.items : []);
    }, 250);
    return () => clearTimeout(tm);
  }, [q, major]);

  async function block(userId: string) {
    await api("/api/community/block", { method: "POST", json: { userId, block: true } });
    setBlocked((b) => [...b, userId]);
  }

  const list = (items ?? []).filter((p) => !blocked.includes(p.userId));
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_260px]">
        <input className="input" placeholder="Навык, интерес или город: Python, MUN, Самарканд" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск людей" />
        <select className="input" value={major} onChange={(e) => setMajor(e.target.value)} aria-label="Направление">
          <option value="">Любое направление</option>
          {MAJORS.map((m) => <option key={m} value={m}>{t.majors[m]}</option>)}
        </select>
      </div>
      {err && <p className="text-sm font-semibold text-red">{err}</p>}
      {items === null ? (
        <p className="text-muted">Загрузка…</p>
      ) : list.length === 0 ? (
        <div className="card text-center text-body">Никого не нашли. Попробуй другое слово.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((p) => (
            <article key={p.userId} className="card flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={p.name} size={44} />
                <div className="min-w-0">
                  <div className="truncate font-extrabold">{p.name}{p.me ? <span className="ml-1.5 text-xs font-semibold text-muted">это ты</span> : null}</div>
                  <div className="truncate text-xs text-muted">{personMeta(p)}</div>
                </div>
              </div>
              {p.lookingFor && <p className="text-sm"><b>Ищет:</b> {p.lookingFor}</p>}
              {p.bio && <p className="line-clamp-3 text-sm text-body">{p.bio}</p>}
              <Chips items={p.skills} />
              {!p.me && (
                <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-line-3 pt-3">
                  <button className="btn-primary px-3.5 py-2 text-sm" onClick={() => start(p.userId)}>Написать</button>
                  <ReportButton type="profile" id={p.userId} />
                  <button className="text-xs font-bold text-muted hover:text-red" onClick={() => block(p.userId)}>Заблокировать</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Orgs({ hasProfile }: { hasProfile: boolean }) {
  const { limits } = usePlan();
  const [items, setItems] = useState<Org[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ name: "", kind: "club" as Org["kind"], city: "", description: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    const r = await api<{ items: Org[] }>("/api/community/orgs");
    setItems(r.ok ? r.data.items : []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setMsg(null);
    setBusy(true);
    const r = await api<{ id: string }>("/api/community/orgs", { method: "POST", json: { ...f, city: f.city || null } });
    if (!r.ok) {
      setBusy(false);
      return setMsg(r.data.message ?? "Не удалось создать.");
    }
    track("community_org_create", { kind: f.kind });
    router.push(`/community/org/${r.data.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-body">Клубы, олимпиадные команды, волонтёрские и медиа-проекты. У каждой — общий чат участников.</p>
        {hasProfile && !creating && <button className="btn-primary px-4 py-2.5 text-sm" onClick={() => setCreating(true)}>+ Создать организацию</button>}
      </div>
      {creating && (
        <div className="card space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Название<input className="input mt-1.5" value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Клуб робототехники школы №110" /></label>
            <label className="block text-sm font-semibold">
              Тип
              <select className="input mt-1.5" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Org["kind"] })}>
                {ORG_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">Город<input className="input mt-1.5" value={f.city} maxLength={60} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Ташкент или «онлайн»" /></label>
            <label className="block text-sm font-semibold sm:col-span-2">Чем занимаетесь<textarea className="input mt-1.5 min-h-24" value={f.description} maxLength={1500} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Цель, как часто встречаетесь, кого ждёте" /></label>
          </div>
          <p className="text-xs text-muted">На твоём тарифе можно создать до {limits.communityOrgs}. Модератор может отметить организацию как проверенную.</p>
          {msg && <p className="text-sm font-semibold text-red">{msg}</p>}
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setCreating(false)}>Отмена</button>
            <button className="btn-primary" disabled={busy || f.name.trim().length < 3 || f.description.trim().length < 10} onClick={create}>{busy ? "Создаём…" : "Создать"}</button>
          </div>
        </div>
      )}
      {items === null ? (
        <p className="text-muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <div className="card text-center text-body">Организаций пока нет. Создай первую — например, клуб своей школы.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((o) => (
            <Link key={o.id} href={`/community/org/${o.id}`} className="card flex flex-col gap-2 transition hover:-translate-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill bg-line-3 text-body">{ORG_KINDS.find((k) => k.id === o.kind)?.label}</span>
                {o.verified && <span className="pill bg-green-soft text-green"><I.Check size={12} /> проверена</span>}
                {o.isMember && <span className="pill bg-primary-soft text-primary-ink">ты участник</span>}
              </div>
              <h3 translate="no" className="text-lg font-extrabold">{o.name}</h3>
              <p className="line-clamp-3 text-sm text-body">{o.description}</p>
              <div className="mt-auto text-xs text-muted">{[o.city, `${o.members} ${plural(o.members)}`].filter(Boolean).join(" · ")}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
