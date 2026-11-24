"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { LANDING, LANGS, type Lang } from "@/lib/i18n/landing";
import s from "./landing.module.css";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const Logo = ({ size = 28, color = "var(--acc)" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ stroke: color }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 10 12 5 2 10l10 5 10-5z" />
    <path d="M6 12v5c3 2 9 2 12 0v-5" />
  </svg>
);

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => setR(matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return r;
}

export default function LandingV4() {
  const [lang, setLang] = useState<Lang>("ru");
  const t = LANDING[lang];
  const reduce = useReducedMotion();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("uh-lang") as Lang | null;
      if (saved && LANDING[saved]) setLang(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const chooseLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem("uh-lang", l);
    } catch {}
  };

  // Появление блоков при прокрутке.
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add(s.in);
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(`.${s.reveal}`).forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = `${(i % 4) * 80}ms`;
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <div className={s.root}>
      <Nav t={t} lang={lang} chooseLang={chooseLang} />
      <Hero t={t} reduce={reduce} />
      <Playground t={t} />
      <Fit t={t} />
      <Path t={t} reduce={reduce} />
      <Features t={t} reduce={reduce} />
      <Pricing t={t} />
      <Faq t={t} />
      <Cta t={t} />
      <Footer t={t} />
    </div>
  );
}

type T = (typeof LANDING)["ru"];

function Nav({ t, lang, chooseLang }: { t: T; lang: Lang; chooseLang: (l: Lang) => void }) {
  return (
    <nav className={s.nav} aria-label="Главное меню">
      <div className={cx(s.navIn, s.glass)}>
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo />
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>UniHelper</span>
        </a>
        <div className={s.navLinks}>
          <a href="#play">{t.nav.play}</a>
          <a href="#path">{t.nav.path}</a>
          <a href="#features">{t.nav.features}</a>
          <a href="#pricing">{t.nav.pricing}</a>
          <a href="#faq">{t.nav.faq}</a>
          <Link href="/demo">{t.nav.demo}</Link>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className={s.lang} role="group" aria-label="Язык / Til / Language">
            {LANGS.map((l) => (
              <button key={l.id} aria-pressed={lang === l.id} onClick={() => chooseLang(l.id)}>{l.label}</button>
            ))}
          </div>
          <span className={s.hideM}><ThemeToggle /></span>
          <Link href="/dashboard" className={cx(s.btn, s.btnGhost, s.btnSm, s.hideM)}>{t.nav.login}</Link>
          <Link href="/quiz" className={cx(s.btn, s.btnPri, s.btnSm)}>{t.nav.start}</Link>
        </div>
      </div>
    </nav>
  );
}

function Hero({ t, reduce }: { t: T; reduce: boolean }) {
  const [wi, setWi] = useState(0);
  useEffect(() => setWi(0), [t]);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setWi((w) => (w + 1) % t.hero.rot.length), 2200);
    return () => clearInterval(id);
  }, [reduce, t]);
  const outer = ["GKS Korea", "Stipendium Hungaricum", "DAAD", "Türkiye Bursları", "Need-based aid"];
  const inner = ["IELTS 7.0", "SAT ≈ 1300", `${t.hero.essay} ✎`];
  return (
    <header id="top" className={s.heroBg}>
      <div className={cx(s.wrap, s.hero)}>
        <div style={{ flex: "1 1 520px", minWidth: 0 }}>
          <span className={cx(s.glass, s.badge)}><b>{t.hero.badgeNew}</b>{t.hero.badge}</span>
          <h1>
            {t.hero.pre}
            <span className={s.rot}>
              <span key={`${wi}-${t.hero.rot[wi]}`} className={s.rotWord}>{t.hero.rot[wi]}</span>
              <svg className={s.underline} viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 9C50 2 150 2 198 7" fill="none" style={{ stroke: "var(--acc-soft)" }} strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
            {t.hero.post}
            <br />
            {t.hero.l2pre}
            <span className={s.serif} style={{ fontSize: "1.08em", color: "var(--acc)" }}>{t.hero.accent}</span>
            {t.hero.l2post}
          </h1>
          <p className={s.muted} style={{ margin: "26px 0 0", fontSize: 19, lineHeight: 1.6, maxWidth: 520 }}>{t.hero.sub}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 34 }}>
            <Link href="/quiz" className={cx(s.btn, s.btnPri)}>
              {t.hero.cta}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
            <a href="#path" className={cx(s.btn, s.btnGhost)}>{t.hero.how}</a>
          </div>
        </div>
        <div style={{ flex: "1 1 460px", minWidth: 0, position: "relative" }}>
          <div className={s.orbit} aria-hidden="true">
            <div className={s.ring}>
              {outer.map((c, i) => (
                <div key={c} className={s.chip} style={{ ["--a" as string]: `${i * 72}deg`, transform: `rotate(${i * 72}deg) translateX(min(280px,46vw))` }}>
                  <span><i style={{ background: i % 2 ? "var(--acc)" : "var(--pri)" }} />{c}</span>
                </div>
              ))}
            </div>
            <div className={cx(s.ring, s.r2)}>
              {inner.map((c, i) => {
                const a = [30, 150, 270][i];
                return (
                  <div key={i} className={s.chip} style={{ ["--a" as string]: `${a}deg`, transform: `rotate(${a}deg) translateX(min(185px,30vw))` }}>
                    <span>{c}</span>
                  </div>
                );
              })}
            </div>
            <div className={s.core}>
              <Logo size={40} color="#FFD2BC" />
              <div style={{ fontWeight: 800, fontSize: "clamp(16px,2.2vw,22px)", marginTop: 8 }}>{t.hero.core}</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{t.hero.coreSub}</div>
            </div>
            <div className={s.sticker} style={{ right: "4%", top: "12%" }}>{t.hero.sticker}</div>
          </div>
        </div>
      </div>
      <div className={s.wrap} style={{ position: "relative", zIndex: 1, marginTop: 28 }}>
        <div className={cx(s.marquee, s.glass)}>
          <div className={s.track}>
            {[...t.marquee, ...t.marquee].map((m, i) => <span key={i}>{m}</span>)}
          </div>
        </div>
      </div>
    </header>
  );
}

function Playground({ t }: { t: T }) {
  const [g, setG] = useState(4.6);
  const [ie, setIe] = useState(6.5);
  const [sa, setSa] = useState(1250);
  const [ac, setAc] = useState(3);
  const [es, setEs] = useState(false);
  const p = t.play;
  const sc = ((g - 3) / 2) * 30 + ((ie - 4) / 5) * 25 + ((sa - 800) / 800) * 20 + (ac / 8) * 15 + (es ? 10 : 0);
  const lvl = sc < 40 ? 0 : sc < 60 ? 1 : sc < 80 ? 2 : 3;
  const deg = Math.max(6, Math.min(100, sc)) * 3.6;
  const tip = ie < 6 ? p.tips.ielts : ac < 3 ? p.tips.act : !es ? p.tips.essay : sa < 1300 ? p.tips.sat : p.tips.ok;
  const P = ({ k, label }: { k: "no" | "real" | "amb" | "high"; label: string }) => (
    <span className={cx(s.pill, k === "no" ? s.tAcc : k === "high" ? s.tSolid : k === "real" ? s.tPri : s.tNeu)}>{label}</span>
  );
  const p1 = ie < 5.5 ? "no" : es && sc >= 60 ? "high" : "real";
  const p2 = ie < 6 ? "no" : sc >= 60 ? "real" : "amb";
  const p3 = ie < 6.5 ? "no" : es && sc >= 75 ? "real" : "amb";
  return (
    <section id="play" className={s.wrap} style={{ padding: "110px 24px 40px" }}>
      <div className={s.reveal} style={{ maxWidth: 780 }}>
        <div className={s.eyebrow}>{p.eyebrow}</div>
        <h2 className={s.h2}>{p.titlePre}<span className={s.serif} style={{ color: "var(--pri)" }}>{p.titleAccent}</span>{p.titlePost}</h2>
      </div>
      <div className={cx(s.play, s.reveal)}>
        <div className={cx(s.ctrl, s.glass)}>
          <Range id="gpa" label={p.gpa} v={g} set={setG} min={3} max={5} step={0.1} fmt={(x) => x.toFixed(1)} />
          <Range id="ielts" label={p.ielts} v={ie} set={setIe} min={4} max={9} step={0.5} fmt={(x) => x.toFixed(1)} />
          <Range id="sat" label={p.sat} v={sa} set={setSa} min={800} max={1600} step={10} fmt={(x) => String(x)} />
          <Range id="act" label={p.act} v={ac} set={setAc} min={0} max={8} step={1} fmt={(x) => String(x)} />
          <div className={s.toggle}>
            <input id="essay" type="checkbox" checked={es} onChange={(e) => setEs(e.target.checked)} />
            <label htmlFor="essay" style={{ margin: 0 }}>{p.essay}</label>
          </div>
          <p className={s.muted} style={{ margin: "22px 0 0", fontSize: 13, lineHeight: 1.5 }}>{p.note}</p>
        </div>
        <div className={cx(s.out, s.inv)}>
          <div style={{ display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap" }}>
            <div className={s.gauge} style={{ background: `conic-gradient(from 220deg, var(--pri) 0deg, var(--pri2) ${deg * 0.6}deg, var(--acc) ${deg}deg, rgba(255,255,255,.1) ${deg}deg)` }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--inv-muted)", fontWeight: 700 }}>{p.strength}</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, padding: "0 8px", lineHeight: 1.2 }} aria-live="polite">{p.levels[lvl]}</div>
              </div>
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".12em", color: "var(--acc-soft)" }}>{p.improve}</div>
              <p style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.6, color: "var(--inv-text)" }} aria-live="polite">{tip}</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 26 }}>
            <div className={cx(s.prog, s.glassInv)}>
              <div><div style={{ fontWeight: 800 }}>{p.p1}</div><div style={{ fontSize: 12, color: "var(--inv-muted)" }}>{p.p1s}</div></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><P k={p1} label={p.pills[p1]} /><span className={s.pill} style={{ background: "#fff", color: "#111834" }}>{p.pills.backup}</span></div>
            </div>
            <div className={cx(s.prog, s.glassInv)}>
              <div><div style={{ fontWeight: 800 }}>{p.p2}</div><div style={{ fontSize: 12, color: "var(--inv-muted)" }}>{p.p2s}</div></div>
              <P k={p2} label={p.pills[p2]} />
            </div>
            <div className={cx(s.prog, s.glassInv)}>
              <div><div style={{ fontWeight: 800 }}>{p.p3}</div><div style={{ fontSize: 12, color: "var(--inv-muted)" }}>{p.p3s}</div></div>
              <P k={p3} label={p.pills[p3]} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Range(props: { id: string; label: string; v: number; set: (n: number) => void; min: number; max: number; step: number; fmt: (n: number) => string }) {
  return (
    <label htmlFor={props.id}>
      <span className={s.row}><span>{props.label}</span><output>{props.fmt(props.v)}</output></span>
      <input id={props.id} type="range" min={props.min} max={props.max} step={props.step} value={props.v} onChange={(e) => props.set(Number(e.target.value))} />
    </label>
  );
}

function Fit({ t }: { t: T }) {
  const [c1, c2, c3] = t.fit.cards;
  return (
    <section className={s.wrap} style={{ padding: "80px 24px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center" }}>
        <div className={s.reveal} style={{ flex: "1 1 420px", minWidth: 0 }}>
          <div className={s.eyebrow}>{t.fit.eyebrow}</div>
          <h2 className={s.h2}>{t.fit.titlePre}<span className={s.serif} style={{ color: "var(--pri)" }}>{t.fit.titleAccent}</span>{t.fit.titlePost}</h2>
          <p className={s.muted} style={{ margin: "20px 0 0", fontSize: 17, lineHeight: 1.65, maxWidth: 460 }}>{t.fit.text}</p>
        </div>
        <div className={s.reveal} style={{ flex: "1 1 460px", minWidth: 0 }}>
          <div className={s.fan}>
            <div className={cx(s.sc, s.s1, s.glass)}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--soft)", letterSpacing: ".1em" }}>01</div>
              <h3>{c1.title}</h3><p className={s.muted}>{c1.text}</p>
            </div>
            <div className={cx(s.sc, s.s3)}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", opacity: 0.7 }}>03</div>
              <h3>{c3.title}</h3><p style={{ opacity: 0.85 }}>{c3.text}</p>
            </div>
            <div className={cx(s.sc, s.s2)}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#FFD2BC", letterSpacing: ".1em" }}>02</div>
              <h3>{c2.title}</h3><p style={{ opacity: 0.9 }}>{c2.text}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Path({ t, reduce }: { t: T; reduce: boolean }) {
  const road = useRef<SVGPathElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const r = road.current, w = wrap.current;
    if (!r || !w) return;
    const L = r.getTotalLength();
    r.style.strokeDasharray = String(L);
    const draw = () => {
      const b = w.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - b.top) / b.height));
      r.style.strokeDashoffset = String(reduce ? 0 : L * (1 - p));
    };
    draw();
    addEventListener("scroll", draw, { passive: true });
    return () => removeEventListener("scroll", draw);
  }, [reduce]);
  const pos = [
    { left: "3%", top: 90 }, { left: "38%", top: 110 }, { left: "55%", top: 235, width: 220 }, { left: "27%", top: 480 }, { left: "66%", top: 560 },
  ];
  const d = "M80 60 C 420 60, 700 40, 900 150 S 1150 330, 820 390 S 200 380, 160 520 S 500 720, 1120 700";
  return (
    <section id="path" className={cx(s.glass, s.pathSec)}>
      <div className={s.wrap}>
        <div className={s.reveal} style={{ textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
          <div className={s.eyebrow}>{t.path.eyebrow}</div>
          <h2 className={s.h2}>{t.path.titlePre}<span className={s.serif} style={{ color: "var(--pri)" }}>{t.path.titleAccent}</span>.</h2>
        </div>
        <div className={s.pathWrap} ref={wrap}>
          <svg className={s.pathSvg} viewBox="0 0 1200 760" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" style={{ stopColor: "var(--pri)" }} />
                <stop offset=".6" style={{ stopColor: "var(--pri2)" }} />
                <stop offset="1" style={{ stopColor: "var(--acc)" }} />
              </linearGradient>
            </defs>
            <path d={d} fill="none" style={{ stroke: "var(--pri-tint)" }} strokeWidth="26" strokeLinecap="round" />
            <path ref={road} d={d} fill="none" stroke="url(#rg)" strokeWidth="6" strokeLinecap="round" />
          </svg>
          {t.path.steps.map((st, i) => (
            <div key={st.title} className={s.ms} style={{ left: pos[i].left, top: pos[i].top, width: pos[i].width }}>
              <div
                className={s.dot}
                style={i === 4 ? { width: 30, height: 30, background: "var(--acc)", borderColor: "var(--acc)", boxShadow: "0 0 0 6px var(--acc-tint)" } : i >= 2 ? { borderColor: "var(--pri2)" } : undefined}
              />
              <h4>{st.title}</h4>
              <p>{st.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const QR_CELLS = Array.from({ length: 49 }, (_, i) => {
  const r = Math.floor(i / 7), c = i % 7;
  const fixed = (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2);
  return fixed || (i * 7 + 3) % 5 < 3;
});

function Features({ t, reduce }: { t: T; reduce: boolean }) {
  const f = t.features;
  const [hard, setHard] = useState(false);
  const [time, setTime] = useState(18 * 60 + 42);
  const [typed, setTyped] = useState(0);
  const [checked, setChecked] = useState(0);
  const typingRef = useRef<HTMLDivElement>(null);
  const [typingOn, setTypingOn] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime((x) => (x > 0 ? x - 1 : 18 * 60 + 42)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => setChecked((c) => (c >= 4 ? 0 : c + 1)), 1300);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const el = typingRef.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setTypingOn(true); io.disconnect(); } });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => setTyped(0), [f.advisor.a]);
  useEffect(() => {
    if (!typingOn) return;
    if (reduce) return setTyped(f.advisor.a.length);
    const done = typed >= f.advisor.a.length;
    const id = setTimeout(() => setTyped(done ? 0 : typed + 1), done ? 4000 : 35);
    return () => clearTimeout(id);
  }, [typingOn, typed, reduce, f.advisor.a]);

  const mm = `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;

  return (
    <section id="features" className={s.wrap} style={{ padding: "110px 24px 60px" }}>
      <div className={s.reveal} style={{ maxWidth: 760 }}>
        <div className={s.eyebrow}>{f.eyebrow}</div>
        <h2 className={s.h2}>{f.titlePre}<span className={s.serif} style={{ color: "var(--pri)" }}>{f.titleAccent}</span>{f.titlePost}</h2>
      </div>
      <div className={s.bento}>
        <div className={cx(s.b, s.c4, s.inv, s.reveal)}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
            <div style={{ flex: "1 1 240px" }}>
              <h3>{f.mocks.title}</h3>
              <p>{f.mocks.text}</p>
              <div className={cx(s.mode, s.glassInv)} style={{ marginTop: 18 }} role="group" aria-label={f.mocks.title}>
                <button className={cx(!hard && s.on)} aria-pressed={!hard} onClick={() => setHard(false)}>{f.mocks.light}</button>
                <button className={cx(s.h, hard && s.on)} aria-pressed={hard} onClick={() => setHard(true)}>{f.mocks.hard}</button>
              </div>
              <div style={{ marginTop: 18 }}>
                <Link href="/mocks" style={{ fontWeight: 800, color: "var(--acc-soft)" }}>→ /mocks</Link>
              </div>
            </div>
            <div className={s.glassInv} style={{ flex: "1 1 260px", borderRadius: 20, padding: 20, transition: "box-shadow .3s", boxShadow: hard ? "0 0 0 2px var(--acc)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 800 }}>
                <span style={{ background: hard ? "var(--acc)" : "var(--pri)", color: "#fff", borderRadius: 8, padding: "4px 10px" }}>{hard ? f.mocks.hardTag : f.mocks.lightTag}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 18 }}>{mm}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--inv-muted)", marginTop: 14 }}>{f.mocks.progress}</div>
              <div style={{ height: 7, borderRadius: 99, background: "rgba(255,255,255,.12)", marginTop: 10 }}>
                <div style={{ width: "63%", height: 7, borderRadius: 99, background: "linear-gradient(90deg,var(--pri),var(--acc-soft))" }} />
              </div>
              <div style={{ fontSize: 13, color: "var(--inv-muted)", marginTop: 14 }}>{hard ? f.mocks.hardNote : f.mocks.lightNote}</div>
            </div>
          </div>
        </div>

        <Link href="/assistant" className={cx(s.b, s.c2, s.glass, s.reveal)}>
          <h3>{f.advisor.title}</h3>
          <p>{f.advisor.text}</p>
          <div className={s.mini}>
            <div style={{ background: "var(--surface-solid)", border: "1px solid var(--line)", borderRadius: "14px 14px 14px 4px", padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{f.advisor.q}</div>
            <div ref={typingRef} style={{ background: "var(--grad)", color: "#fff", borderRadius: "14px 14px 4px 14px", padding: "10px 12px", fontSize: 13, marginTop: 8, marginLeft: 24, minHeight: 38 }}>
              {f.advisor.a.slice(0, typed)}
              {typed < f.advisor.a.length ? "▍" : ""}
            </div>
          </div>
        </Link>

        <Link href="/roadmap" className={cx(s.b, s.c2, s.glass, s.reveal)}>
          <h3>{f.roadmap.title}</h3>
          <p>{f.roadmap.text}</p>
          <div className={s.mini}>
            {f.roadmap.checks.map((c, i) => (
              <div key={c} className={cx(s.check, i < checked && s.done)}><i />{c}</div>
            ))}
          </div>
        </Link>

        <Link href="/events" className={cx(s.b, s.c2, s.glass, s.reveal)}>
          <h3>{f.events.title}</h3>
          <p>{f.events.text}</p>
          <div className={s.mini} style={{ display: "flex", gap: 14, alignItems: "center", borderStyle: "dashed" }}>
            <div className={s.qr} aria-hidden="true">{QR_CELLS.map((on, i) => <i key={i} className={on ? undefined : s.o} />)}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{f.events.event}</div>
              <div className={s.muted} style={{ fontSize: 12.5, marginTop: 4 }}>{f.events.ticket}</div>
            </div>
          </div>
        </Link>

        <Link
          href="/lessons"
          className={cx(s.b, s.c2, s.reveal)}
          style={{ background: "linear-gradient(155deg,color-mix(in srgb,var(--acc) 22%,var(--surface-solid)),color-mix(in srgb,var(--acc) 55%,var(--surface-solid)))", border: "1px solid var(--line)" }}
        >
          <h3>{f.lessons.title}</h3>
          <p style={{ color: "var(--text)", opacity: 0.75 }}>{f.lessons.text}</p>
          <div className={s.mini} style={{ background: "var(--surface-solid)", display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--acc)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", boxShadow: "0 8px 20px color-mix(in srgb,var(--acc) 40%,transparent)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{f.lessons.lesson}</div>
              <div className={s.muted} style={{ fontSize: 12.5 }}>{f.lessons.of}</div>
            </div>
          </div>
        </Link>

        <Link href="/portfolio" className={cx(s.b, s.c3, s.glass, s.reveal)}>
          <h3>{f.portfolio.title}</h3>
          <p>{f.portfolio.text}</p>
          <div style={{ marginTop: 18, border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", background: "color-mix(in srgb,var(--text) 3%,transparent)" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "9px 12px", borderBottom: "1px solid var(--line)", fontSize: 12, fontWeight: 700, color: "var(--soft)" }}>
              {[0, 1, 2].map((i) => <i key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--line)" }} />)}
              <span style={{ marginLeft: 8 }}>unihelper.uz/p/aziz</span>
            </div>
            <div style={{ padding: 18, display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,var(--pri),var(--pri2) 55%,var(--acc))", flex: "none" }} />
              <div>
                <div style={{ fontWeight: 800 }}>Азиз К.</div>
                <div className={s.muted} style={{ fontSize: 13 }}>{f.portfolio.bio}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, padding: "0 18px 18px" }}>
              <div style={{ height: 56, borderRadius: 10, background: "var(--pri-tint)" }} />
              <div style={{ height: 56, borderRadius: 10, background: "var(--acc-tint)" }} />
              <div style={{ height: 56, borderRadius: 10, background: "var(--pri-tint)" }} />
            </div>
          </div>
        </Link>

        <Link href="/programs" className={cx(s.b, s.c3, s.reveal)} style={{ background: "var(--grad)", color: "#fff", border: "1px solid var(--line)" }}>
          <h3>{f.local.title}</h3>
          <p style={{ color: "#fff", opacity: 0.85 }}>{f.local.text}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
            {f.local.tags.map((tag, i) => (
              <span key={tag} className={s.pill} style={i === 3 ? { background: "#fff", color: "var(--pri2)", fontSize: 13, padding: "8px 12px" } : { background: "rgba(255,255,255,.16)", fontSize: 13, padding: "8px 12px" }}>{tag}</span>
            ))}
          </div>
        </Link>
      </div>
    </section>
  );
}

function Pricing({ t }: { t: T }) {
  return (
    <section id="pricing" className={s.wrap} style={{ padding: "80px 24px" }}>
      <div className={s.reveal} style={{ maxWidth: 760 }}>
        <div className={s.eyebrow}>{t.pricing.eyebrow}</div>
        <h2 className={s.h2}>{t.pricing.titlePre}<span className={s.serif} style={{ color: "var(--pri)" }}>{t.pricing.titleAccent}</span>.</h2>
      </div>
      <div className={s.price}>
        {t.pricing.plans.map((p, i) => (
          <div key={p.name} className={cx(s.pc, i === 1 ? s.inv : s.glass, s.reveal)}>
            {i === 1 && <span className={s.sticker} style={{ right: 18, top: 18, transform: "rotate(6deg)" }}>{t.pricing.popular}</span>}
            <div style={{ fontWeight: 800 }}>{p.name}</div>
            <div className={s.amt}>{p.amt}{p.per && <span>{p.per}</span>}</div>
            <ul>{p.items.map((x) => <li key={x}>{x}</li>)}</ul>
            <Link href={i === 3 ? "/demo" : "/quiz"} className={cx(s.btn, i === 1 ? s.btnPri : s.btnGhost)} style={{ marginTop: "auto" }}>{p.cta}</Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq({ t }: { t: T }) {
  return (
    <section id="faq" style={{ maxWidth: 860, margin: "0 auto", padding: "60px 24px 100px" }}>
      <h2 className={cx(s.h2, s.reveal)} style={{ textAlign: "center", marginBottom: 36 }}>{t.faq.title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {t.faq.items.map((f, i) => (
          <details key={f.q} className={cx(s.faq, s.glass, s.reveal)} open={i === 0}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Cta({ t }: { t: T }) {
  const [c, setC] = useState<string | null>(null);
  const label = useMemo(() => t.cta.countries.find((x) => x.id === c)?.label, [c, t]);
  return (
    <section id="cta" className={s.wrap} style={{ paddingBottom: 40 }}>
      <div className={cx(s.cta, s.reveal)}>
        <div style={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
        <h2 className={s.h2} style={{ position: "relative", maxWidth: 820, margin: "0 auto" }}>
          {t.cta.titlePre}<span className={s.serif} style={{ color: "#FFD2BC" }}>{t.cta.titleAccent}</span>{t.cta.titlePost}
        </h2>
        <div className={s.ask} role="group">
          {t.cta.countries.map((x) => (
            <button key={x.id} aria-pressed={c === x.id} onClick={() => setC(x.id)}>{x.label}</button>
          ))}
        </div>
        <Link href={c ? `/quiz?country=${c}` : "/quiz"} className={s.btn} style={{ position: "relative", marginTop: 30, background: "#fff", color: "var(--pri2)" }}>
          {label ? t.cta.goFor.replace("{c}", label) : t.cta.go}
        </Link>
        <p style={{ position: "relative", margin: "16px 0 0", fontSize: 14, opacity: 0.85 }}>{t.cta.note}</p>
      </div>
    </section>
  );
}

function Footer({ t }: { t: T }) {
  return (
    <footer className={s.wrap} style={{ padding: "60px 24px 30px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between", fontSize: 14, color: "var(--muted)" }}>
        <div style={{ maxWidth: 300, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>UniHelper</div>
          {t.footer.tagline}
        </div>
        <div style={{ display: "flex", gap: 56, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <b style={{ color: "var(--text)" }}>{t.footer.product}</b>
            <a href="#features">{t.nav.features}</a>
            <a href="#pricing">{t.nav.pricing}</a>
            <a href="#faq">{t.nav.faq}</a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <b style={{ color: "var(--text)" }}>{t.footer.partners}</b>
            <Link href="/demo">{t.footer.schools}</Link>
            <Link href="/demo">{t.footer.unis}</Link>
            <Link href="/events">{t.footer.organizers}</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <b style={{ color: "var(--text)" }}>{t.footer.demo}</b>
            <Link href="/demo">{t.footer.investors}</Link>
            <Link href="/mocks">SAT / IELTS</Link>
          </div>
        </div>
      </div>
      <div className={s.wordmark} aria-hidden="true">UniHelper</div>
      <div style={{ fontSize: 13, color: "var(--soft)", textAlign: "center", marginTop: 20 }}>© 2026 UniHelper</div>
    </footer>
  );
}
