import type { PortfolioBlock, PortfolioState, PortfolioTemplate } from "./clientStore";

// Сайт-портфолио: шаблоны, разделы и «публичный снимок» для публикации.

export const TEMPLATES: { id: PortfolioTemplate; label: string; pro: boolean }[] = [
  { id: "minimal", label: "Минимализм", pro: false },
  { id: "creative", label: "Креатив", pro: false },
  { id: "academic", label: "Академический", pro: true },
  { id: "bold", label: "Яркий", pro: true },
  { id: "night", label: "Ночной", pro: true },
];

export const PRESET_COLORS = ["#2F62E8", "#EE7F4F", "#1F7A3D"];

export const BUILTIN_SECTIONS: { id: string; label: string }[] = [
  { id: "about", label: "О себе" },
  { id: "projects", label: "Проекты" },
  { id: "achievements", label: "Достижения" },
  { id: "activities", label: "Активности" },
  { id: "tests", label: "Тесты" },
  { id: "contact", label: "Контакт" },
];

export function normalizePortfolio(pf: PortfolioState): Required<Pick<PortfolioState, "order" | "blocks" | "accent" | "font">> & PortfolioState {
  const blocks = pf.blocks ?? [];
  const known = [...BUILTIN_SECTIONS.map((s) => s.id), ...blocks.map((b) => b.id)];
  const order = [...(pf.order ?? []).filter((id) => known.includes(id)), ...known.filter((id) => !(pf.order ?? []).includes(id))];
  return { ...pf, blocks, order, accent: pf.accent ?? PRESET_COLORS[0], font: pf.font ?? "sans" };
}

/** Публичный снимок — только то, что ученик решил показать. */
export interface PortfolioSnapshot {
  name: string;
  headline: string;
  template: PortfolioTemplate;
  accent: string;
  font: "sans" | "serif";
  hideBadge: boolean;
  sections: {
    id: string;
    title: string;
    kind: "text" | "projects" | "list" | "links" | "skills" | "contact";
    text?: string;
    items?: string[];
    projects?: { title: string; text: string }[];
    links?: { label: string; url: string }[];
  }[];
}

export function newBlock(type: PortfolioBlock["type"]): PortfolioBlock {
  const id = `b-${Math.random().toString(36).slice(2, 8)}`;
  if (type === "links") return { id, type, title: "Ссылки", links: [{ label: "GitHub", url: "https://github.com/" }] };
  if (type === "skills") return { id, type, title: "Навыки", items: ["Python", "Английский B2"] };
  return { id, type, title: "Свой раздел", text: "" };
}

/** Только http(s) с адресом сайта: «https://» без домена и javascript:… на сайт не попадут. */
const safeUrl = (u: string) => (/^https?:\/\/[^\s/]+\.[^\s]+/i.test(u.trim()) ? u.trim().slice(0, 300) : null);

export function buildSnapshot(args: {
  pf: PortfolioState;
  name: string;
  majorLabel: string;
  city: string;
  achievementsText: string;
  activities: string[];
  tests: string | null;
  contact: { phone?: string; email?: string } | null;
  canHideBadge: boolean;
}): PortfolioSnapshot {
  const pf = normalizePortfolio(args.pf);
  const on = (id: string) => pf.sections[id] !== false;
  const achievements = args.achievementsText.split(/[,;\n]/).map((x) => x.trim()).filter((x) => x.length > 3).slice(0, 12);
  const sections: PortfolioSnapshot["sections"] = [];
  for (const id of pf.order) {
    const block = pf.blocks.find((b) => b.id === id);
    if (block) {
      if (block.type === "text" && block.text?.trim()) sections.push({ id, title: block.title, kind: "text", text: block.text.slice(0, 2000) });
      if (block.type === "skills" && block.items?.length) sections.push({ id, title: block.title, kind: "skills", items: block.items.slice(0, 30).map((x) => x.slice(0, 60)) });
      if (block.type === "links") {
        const links = (block.links ?? []).map((l) => ({ label: l.label.slice(0, 60), url: safeUrl(l.url) })).filter((l): l is { label: string; url: string } => Boolean(l.url));
        if (links.length) sections.push({ id, title: block.title, kind: "links", links });
      }
      continue;
    }
    if (!on(id)) continue;
    if (id === "about" && pf.about.trim()) sections.push({ id, title: "О себе", kind: "text", text: pf.about.slice(0, 2000) });
    if (id === "projects" && pf.projects.length) sections.push({ id, title: "Проекты", kind: "projects", projects: pf.projects.slice(0, 12) });
    if (id === "achievements" && achievements.length) sections.push({ id, title: "Достижения", kind: "list", items: achievements });
    if (id === "activities" && args.activities.length) sections.push({ id, title: "Активности", kind: "list", items: args.activities });
    if (id === "tests" && pf.showFields.scores && args.tests) sections.push({ id, title: "Тесты", kind: "text", text: args.tests });
    if (id === "contact") {
      const items = [pf.showFields.phone ? args.contact?.phone : null, pf.showFields.email ? args.contact?.email : null].filter(Boolean) as string[];
      if (items.length) sections.push({ id, title: "Контакт", kind: "contact", items });
    }
  }
  return {
    name: args.name.slice(0, 80),
    headline: (pf.headline?.trim() || `${args.majorLabel}${pf.showFields.city && args.city ? ` · ${args.city}` : ""}`).slice(0, 140),
    template: pf.template,
    accent: /^#[0-9a-f]{6}$/i.test(pf.accent) ? pf.accent : PRESET_COLORS[0],
    font: pf.font,
    hideBadge: Boolean(pf.hideBadge && args.canHideBadge),
    sections,
  };
}
