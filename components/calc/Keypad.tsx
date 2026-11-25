"use client";

// Экранная клавиатура (на телефоне без неё не набрать ^, √, |x|, ≤). Кнопки не забирают фокус у строки.

export type KeyAction = { insert: string; caret?: number } | { cmd: "left" | "right" | "back" | "enter" };

const KEYS: { label: string; a: KeyAction; wide?: boolean; tone?: "num" | "op" | "fn" }[][] = [
  [
    { label: "x", a: { insert: "x" } }, { label: "y", a: { insert: "y" } }, { label: "a²", a: { insert: "^2" } }, { label: "aᵇ", a: { insert: "^" } },
    { label: "√", a: { insert: "sqrt()", caret: -1 } }, { label: "π", a: { insert: "π" } }, { label: "(", a: { insert: "(" } }, { label: ")", a: { insert: ")" } },
  ],
  [
    { label: "7", a: { insert: "7" }, tone: "num" }, { label: "8", a: { insert: "8" }, tone: "num" }, { label: "9", a: { insert: "9" }, tone: "num" }, { label: "÷", a: { insert: "/" }, tone: "op" },
    { label: "|a|", a: { insert: "||", caret: -1 } }, { label: "sin", a: { insert: "sin()", caret: -1 }, tone: "fn" }, { label: "cos", a: { insert: "cos()", caret: -1 }, tone: "fn" }, { label: "tan", a: { insert: "tan()", caret: -1 }, tone: "fn" },
  ],
  [
    { label: "4", a: { insert: "4" }, tone: "num" }, { label: "5", a: { insert: "5" }, tone: "num" }, { label: "6", a: { insert: "6" }, tone: "num" }, { label: "×", a: { insert: "*" }, tone: "op" },
    { label: "<", a: { insert: "<" } }, { label: ">", a: { insert: ">" } }, { label: "≤", a: { insert: "<=" } }, { label: "≥", a: { insert: ">=" } },
  ],
  [
    { label: "1", a: { insert: "1" }, tone: "num" }, { label: "2", a: { insert: "2" }, tone: "num" }, { label: "3", a: { insert: "3" }, tone: "num" }, { label: "−", a: { insert: "-" }, tone: "op" },
    { label: "ln", a: { insert: "ln()", caret: -1 }, tone: "fn" }, { label: "log", a: { insert: "log()", caret: -1 }, tone: "fn" }, { label: "e", a: { insert: "e" } }, { label: "=", a: { insert: "=" } },
  ],
  [
    { label: "0", a: { insert: "0" }, tone: "num" }, { label: ".", a: { insert: "." }, tone: "num" }, { label: ",", a: { insert: ", " } }, { label: "+", a: { insert: "+" }, tone: "op" },
    { label: "←", a: { cmd: "left" } }, { label: "→", a: { cmd: "right" } }, { label: "⌫", a: { cmd: "back" } }, { label: "⏎", a: { cmd: "enter" } },
  ],
];

export default function Keypad({ onKey }: { onKey: (a: KeyAction) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1 border-t border-line bg-bg p-2" role="group" aria-label="Клавиатура калькулятора" translate="no">
      {KEYS.flat().map((k) => (
        <button
          key={k.label}
          className={`h-10 rounded-lg text-[15px] font-bold active:scale-95 ${k.tone === "num" ? "bg-surface-solid" : k.tone === "op" ? "bg-line-3" : k.tone === "fn" ? "bg-surface-solid text-[13px]" : "bg-surface-solid"} border border-line`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onKey(k.a)}
          aria-label={k.label === "⌫" ? "Стереть" : k.label === "⏎" ? "Новая строка" : k.label === "←" ? "Курсор влево" : k.label === "→" ? "Курсор вправо" : k.label}
        >
          {k.label}
        </button>
      ))}
    </div>
  );
}
