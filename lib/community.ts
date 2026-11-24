// Комьюнити: общие типы и чистые функции (используются и на клиенте, и на сервере).

export const POST_KINDS = [
  { id: "team", label: "Ищу команду" },
  { id: "study", label: "Учимся вместе" },
  { id: "question", label: "Вопрос" },
] as const;
export type PostKind = (typeof POST_KINDS)[number]["id"];

export const ORG_KINDS = [
  { id: "club", label: "Клуб" },
  { id: "olympiad", label: "Олимпиадная команда" },
  { id: "volunteer", label: "Волонтёрство" },
  { id: "startup", label: "Стартап" },
  { id: "media", label: "Медиа" },
  { id: "other", label: "Другое" },
] as const;
export type OrgKind = (typeof ORG_KINDS)[number]["id"];

export interface PublicProfile {
  userId: string;
  name: string;
  grade: number | null;
  city: string | null;
  major: string | null;
  bio: string;
  skills: string[];
  lookingFor: string;
}

export interface Post {
  id: string;
  kind: PostKind;
  title: string;
  body: string;
  roles: string[];
  tags: string[];
  status: "open" | "closed";
  createdAt: string;
  author: PublicProfile | null;
  mine: boolean;
}

export interface Org {
  id: string;
  slug: string;
  name: string;
  kind: OrgKind;
  city: string | null;
  description: string;
  verified: boolean;
  members: number;
  isMember: boolean;
  isOwner: boolean;
}

export interface ChatSummary {
  id: string;
  kind: "direct" | "org";
  title: string;
  peerId: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unread: number;
}

export interface Message {
  id: number;
  userId: string | null;
  author: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

/** Ключ личного чата: не зависит от того, кто начал разговор. */
export function directKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

const TRANSLIT: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ы: "y", э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h" };

export function slugifyOrg(name: string): string {
  const s = name
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT[c] ?? c)
    .join("")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return s.length >= 3 ? s : `org-${s || "x"}`.padEnd(5, "0");
}

/** Навыки и роли: без дублей, обрезанные, не больше max штук. */
export function cleanList(items: string[], max = 12, len = 40): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const x = raw.replace(/\s+/g, " ").trim().slice(0, len);
    const k = x.toLowerCase();
    if (x.length < 2 || seen.has(k)) continue;
    seen.add(k);
    out.push(x);
    if (out.length >= max) break;
  }
  return out;
}

/** Похоже ли сообщение на обмен контактами — для предупреждения перед отправкой. */
export function looksLikeContact(text: string): boolean {
  const digits = text.replace(/[^\d+]/g, "");
  if (/\+?\d{9,}/.test(digits)) return true;
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) return true;
  if (/(^|\s)@[a-z0-9_]{5,}/i.test(text) || /t\.me\//i.test(text)) return true;
  if (/(адрес|улиц|дом\s*\d|кв\.?\s*\d|manzil|ko'?cha)/i.test(text)) return true;
  return false;
}

export function gradeLabel(grade: number | null): string | null {
  if (grade == null) return null;
  if (grade <= 11) return `${grade} класс`;
  return `${grade - 11} курс`;
}

export function plural(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "участник";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "участника";
  return "участников";
}
