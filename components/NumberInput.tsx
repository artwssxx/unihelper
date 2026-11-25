"use client";

import { useEffect, useState } from "react";
import { parseDecimal, typingDecimal } from "@/lib/num";

/**
 * Числовое поле, которое работает на телефоне: принимает и запятую, и точку («4,2»), не стирает ввод,
 * отдаёт число или null. Целые (SAT, бюджет) — decimals={false}: открывается цифровая клавиатура.
 */
export default function NumberInput({ value, onChange, decimals = true, className = "input", ...rest }: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  decimals?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [raw, setRaw] = useState(value == null ? "" : String(value));
  // Значение поменяли снаружи (автозаполнение, сертификат) — показываем его.
  useEffect(() => {
    if (parseDecimal(raw) !== (value ?? null)) setRaw(value == null ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      {...rest}
      className={className}
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      autoComplete="off"
      value={raw}
      onChange={(e) => {
        const v = e.target.value;
        if (!typingDecimal(v) || (!decimals && /[.,]/.test(v))) return;
        setRaw(v);
        onChange(parseDecimal(v));
      }}
    />
  );
}
