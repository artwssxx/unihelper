"use client";

import { useEffect, useRef, useState } from "react";

// Официальный Desmos (как в Bluebook) — только если задан ключ API NEXT_PUBLIC_DESMOS_API_KEY
// (выдаёт Desmos по запросу для образовательных проектов). Без ключа работает калькулятор UniHelper.

export const DESMOS_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY;

type Desmos = { GraphingCalculator: (el: HTMLElement, opts: object) => { destroy: () => void } };

let loading: Promise<Desmos> | null = null;
function loadDesmos(): Promise<Desmos> {
  const w = window as unknown as { Desmos?: Desmos };
  if (w.Desmos) return Promise.resolve(w.Desmos);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${encodeURIComponent(DESMOS_KEY ?? "")}`;
    s.async = true;
    s.onload = () => (w.Desmos ? resolve(w.Desmos) : reject(new Error("desmos")));
    s.onerror = () => { loading = null; reject(new Error("desmos")); };
    document.head.appendChild(s);
  });
  return loading;
}

export default function DesmosEmbed() {
  const el = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let calc: { destroy: () => void } | null = null;
    let off = false;
    loadDesmos()
      .then((D) => {
        if (!off && el.current) calc = D.GraphingCalculator(el.current, { keypad: true, expressions: true, settingsMenu: true, zoomButtons: true, border: false });
      })
      .catch(() => setErr(true));
    return () => {
      off = true;
      calc?.destroy();
    };
  }, []);
  if (err) return <p className="p-4 text-sm text-red">Desmos не загрузился. Переключитесь на калькулятор UniHelper.</p>;
  return <div ref={el} className="h-full min-h-[420px] w-full" />;
}
