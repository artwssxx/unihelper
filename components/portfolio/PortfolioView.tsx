import type { PortfolioSnapshot } from "@/lib/portfolio";

// Отрисовка сайта-портфолио по публичному снимку. Без хуков — работает и на сервере (/p/[slug]), и в превью.

const THEMES: Record<PortfolioSnapshot["template"], { page: string; ink: string; muted: string; card: string; hero: (a: string) => React.CSSProperties; heroInk: string; line: string }> = {
  minimal: { page: "#FFFFFF", ink: "#111834", muted: "#566079", card: "#F5F6FA", hero: () => ({ background: "#FFFFFF" }), heroInk: "#111834", line: "rgba(17,24,52,.1)" },
  creative: { page: "#FFF8F3", ink: "#111834", muted: "#5B5470", card: "#FFFFFF", hero: (a) => ({ background: `linear-gradient(135deg, ${a}, #EE7F4F)` }), heroInk: "#FFFFFF", line: "rgba(17,24,52,.08)" },
  academic: { page: "#FBFAF7", ink: "#1B1F2E", muted: "#5A5F70", card: "#FFFFFF", hero: () => ({ background: "#1B1F2E" }), heroInk: "#FFFFFF", line: "rgba(27,31,46,.12)" },
  bold: { page: "#F5F6FA", ink: "#111834", muted: "#566079", card: "#FFFFFF", hero: (a) => ({ background: `radial-gradient(60% 90% at 100% 0%, #EE7F4F55, transparent 60%), linear-gradient(135deg, ${a}, #4B4DDB)` }), heroInk: "#FFFFFF", line: "rgba(17,24,52,.08)" },
  night: { page: "#0A0E1C", ink: "#EAEEF8", muted: "#A3ADC6", card: "#131B34", hero: (a) => ({ background: `radial-gradient(70% 90% at 100% 0%, ${a}66, transparent 60%), #0E1427` }), heroInk: "#EAEEF8", line: "rgba(255,255,255,.1)" },
};

export default function PortfolioView({ s, preview = false }: { s: PortfolioSnapshot; preview?: boolean }) {
  const th = THEMES[s.template] ?? THEMES.minimal;
  const serif = s.font === "serif" ? { fontFamily: "var(--font-instrument), Georgia, serif", fontStyle: "italic" as const, fontWeight: 400 } : {};
  const initials = s.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "U";
  return (
    <article style={{ background: th.page, color: th.ink }} className={`overflow-hidden ${preview ? "rounded-[26px] border border-line" : "min-h-screen"}`}>
      <header style={{ ...th.hero(s.accent), color: th.heroInk }} className="px-6 py-12 sm:px-12 sm:py-16">
        <div className="mx-auto max-w-[880px]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-extrabold text-white" style={{ background: s.template === "minimal" ? s.accent : "rgba(255,255,255,.18)", border: "2px solid rgba(255,255,255,.35)" }} aria-hidden>
            {initials}
          </div>
          <h1 className="mt-5 text-[40px] font-extrabold leading-tight tracking-tight sm:text-[52px]" style={serif}>{s.name}</h1>
          {s.headline && <p className="mt-2 text-lg opacity-90">{s.headline}</p>}
        </div>
      </header>
      <div className="mx-auto max-w-[880px] space-y-9 px-6 py-10 sm:px-12">
        {s.sections.map((sec) => (
          <section key={sec.id}>
            <h2 className="text-xs font-extrabold tracking-[0.14em]" style={{ color: s.accent }}>{sec.title.toUpperCase()}</h2>
            {sec.kind === "text" && <p className="mt-3 whitespace-pre-line text-[17px] leading-relaxed">{sec.text}</p>}
            {sec.kind === "list" && (
              <ul className="mt-3 space-y-2">
                {sec.items?.map((x, i) => (
                  <li key={i} className="flex gap-3 text-[16px] leading-relaxed"><span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: s.accent }} />{x}</li>
                ))}
              </ul>
            )}
            {sec.kind === "projects" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {sec.projects?.map((p, i) => (
                  <div key={i} className="rounded-2xl p-5" style={{ background: th.card, border: `1px solid ${th.line}` }}>
                    <div className="font-extrabold">{p.title}</div>
                    {p.text && <p className="mt-1.5 text-[15px] leading-relaxed" style={{ color: th.muted }}>{p.text}</p>}
                  </div>
                ))}
              </div>
            )}
            {sec.kind === "skills" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {sec.items?.map((x, i) => <span key={i} className="rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: `${s.accent}1f`, color: s.template === "night" ? th.ink : s.accent }}>{x}</span>)}
              </div>
            )}
            {sec.kind === "links" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {sec.links?.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: th.card, border: `1px solid ${th.line}`, color: th.ink }}>
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
            {sec.kind === "contact" && <div className="mt-3 space-y-1 text-[16px]">{sec.items?.map((x, i) => <div key={i}>{x}</div>)}</div>}
          </section>
        ))}
        {s.sections.length === 0 && <p style={{ color: th.muted }}>Разделы пока пустые.</p>}
      </div>
      {!s.hideBadge && (
        <footer className="px-6 pb-8 text-center text-xs sm:px-12" style={{ color: th.muted }}>
          Сделано в <a href="/" style={{ color: s.accent, fontWeight: 800 }}>UniHelper</a>
        </footer>
      )}
    </article>
  );
}
