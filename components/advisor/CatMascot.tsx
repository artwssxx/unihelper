// Юни — котик-амбассадор AI Advisor: рыжий кот в академической шапочке.
// Состояния: idle (дышит, моргает, водит хвостом), wave (машет лапой), thinking (печатает лапками, смотрит вверх),
// happy (довольно щурится). Анимации — только transform в CSS (globals.css, .cat-*), без JS; при
// prefers-reduced-motion отключаются. Цвета — токены --cat-* из globals.css.

export type CatMood = "idle" | "wave" | "thinking" | "happy";

export default function CatMascot({ mood = "idle", size = 120, head = false, className = "" }: { mood?: CatMood; size?: number; head?: boolean; className?: string }) {
  // Только голова — для аватарки в чате.
  const vb = head ? "18 2 84 80" : "0 0 120 128";
  const eyes =
    mood === "happy" ? (
      <g className="cat-line" fill="none" strokeWidth={2.6} strokeLinecap="round">
        <path d="M43 52 q5 -6 10 0" />
        <path d="M67 52 q5 -6 10 0" />
      </g>
    ) : (
      <g className={mood === "thinking" ? "cat-look-up" : ""}>
        <g className="cat-eye"><ellipse cx="48" cy="51" rx="4.6" ry="6" className="cat-eye-fill" /><circle cx="49.6" cy="48.6" r="1.6" className="cat-shine" /></g>
        <g className="cat-eye"><ellipse cx="72" cy="51" rx="4.6" ry="6" className="cat-eye-fill" /><circle cx="73.6" cy="48.6" r="1.6" className="cat-shine" /></g>
      </g>
    );

  return (
    <svg viewBox={vb} width={size} height={head ? size * (80 / 84) : size * (128 / 120)} className={`cat cat-${mood} ${className}`} role="img" aria-label="Юни — котик UniHelper">
      {!head && (
        <>
          {/* хвост за телом */}
          <path className="cat-tail cat-fur-stroke" d="M86 108 C108 104 112 84 104 70" fill="none" strokeWidth={9} strokeLinecap="round" />
          {/* тело */}
          <ellipse cx="60" cy="96" rx="31" ry="26" className="cat-fur" />
          <ellipse cx="60" cy="102" rx="17" ry="17" className="cat-belly" />
          {/* лапки: при «думает» печатают, при «машет» правая поднята */}
          <ellipse className="cat-paw cat-paw-l cat-fur-2" cx="47" cy="120" rx="9" ry="6" />
          {mood === "wave" ? (
            <g className="cat-wave-arm">
              <path d="M84 92 C94 84 98 74 96 66" className="cat-fur-stroke" fill="none" strokeWidth={9} strokeLinecap="round" />
              <circle cx="96" cy="64" r="6" className="cat-fur-2" />
            </g>
          ) : (
            <ellipse className="cat-paw cat-paw-r cat-fur-2" cx="73" cy="120" rx="9" ry="6" />
          )}
        </>
      )}
      <g className="cat-head">
        {/* уши */}
        <path d="M33 40 L37 13 L56 29 Z" className="cat-fur" />
        <path d="M38 34 L40 19 L50 29 Z" className="cat-pink" />
        <g className="cat-ear">
          <path d="M87 40 L83 13 L64 29 Z" className="cat-fur" />
          <path d="M82 34 L80 19 L70 29 Z" className="cat-pink" />
        </g>
        {/* голова */}
        <ellipse cx="60" cy="52" rx="31" ry="26" className="cat-fur" />
        <path d="M54 30 l2 7 M60 28 v8 M66 30 l-2 7" className="cat-fur-2-stroke" strokeWidth={2.4} strokeLinecap="round" />
        <ellipse cx="60" cy="63" rx="14" ry="9" className="cat-belly" />
        {eyes}
        <ellipse cx="40" cy="62" rx="5" ry="3" className="cat-blush" />
        <ellipse cx="80" cy="62" rx="5" ry="3" className="cat-blush" />
        <path d="M57 59 h6 l-3 3.4 Z" className="cat-pink" />
        <path d={mood === "happy" ? "M60 62.5 q-4 6 -8 1.5 M60 62.5 q4 6 8 1.5" : "M60 62.5 q-3.5 4 -7 1.5 M60 62.5 q3.5 4 7 1.5"} className="cat-line" fill="none" strokeWidth={1.8} strokeLinecap="round" />
        <g className="cat-line" strokeWidth={1.2} strokeLinecap="round" opacity={0.55}>
          <path d="M44 63 l-14 -2 M44 66 l-13 3" />
          <path d="M76 63 l14 -2 M76 66 l13 3" />
        </g>
        {/* академическая шапочка */}
        <g className="cat-cap">
          <path d="M60 14 L88 24 L60 34 L32 24 Z" className="cat-cap-top" />
          <path d="M46 29 v6 c8 4 20 4 28 0 v-6 L60 34 Z" className="cat-cap-top" />
          <g className="cat-tassel">
            <path d="M60 24 L84 27 v10" className="cat-tassel-line" fill="none" strokeWidth={1.6} strokeLinecap="round" />
            <circle cx="84" cy="39" r="2.6" className="cat-tassel-end" />
          </g>
        </g>
      </g>
      {mood === "thinking" && !head && (
        <g className="cat-dots">
          <circle cx="98" cy="20" r="3" className="cat-bubble" />
          <circle cx="106" cy="12" r="3.6" className="cat-bubble" />
          <circle cx="115" cy="5" r="4" className="cat-bubble" />
        </g>
      )}
    </svg>
  );
}
