"use client";

import { usePathname, useRouter } from "next/navigation";
import { exitDemo, setDemoStep, setTourVisible, TOUR } from "@/lib/demo";
import type { Stored } from "@/lib/clientStore";
import * as I from "./icons";

/** Плавающая панель тура для инвесторов поверх кабинета. */
export default function DemoTour({ demo }: { demo: NonNullable<Stored["demo"]> }) {
  const router = useRouter();
  const path = usePathname();
  const step = TOUR[demo.step] ?? TOUR[0];
  const here = path === step.path.split("#")[0];

  const go = (i: number) => {
    const n = Math.max(0, Math.min(TOUR.length - 1, i));
    setDemoStep(n);
    router.push(TOUR[n].path);
  };

  if (!demo.tour) {
    return (
      <button
        onClick={() => setTourVisible(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-ink px-5 py-3 text-sm font-extrabold text-white shadow-[0_16px_40px_rgba(14,26,58,.3)]"
      >
        Демо-тур · {demo.step + 1}/{TOUR.length}
      </button>
    );
  }

  return (
    <aside
      aria-label="Демо-тур для инвесторов"
      className="fixed inset-x-3 bottom-3 z-40 rounded-[22px] bg-ink p-5 text-white shadow-[0_24px_60px_rgba(14,26,58,.35)] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-lg bg-orange px-2.5 py-1 text-xs font-extrabold">ДЕМО · {demo.step + 1} из {TOUR.length}</span>
        <button onClick={() => setTourVisible(false)} aria-label="Свернуть тур" className="rounded-lg p-1 text-navy-text hover:text-white">
          <I.Close size={18} />
        </button>
      </div>
      <h2 className="mt-3 text-lg font-extrabold">{step.title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-navy-text">{step.text}</p>
      {step.try && <p className="mt-2 rounded-xl bg-navy-2 px-3 py-2 text-[13px] text-white"><b className="text-peach">Попробуйте: </b>{step.try}</p>}
      <div className="mt-4 flex items-center gap-2">
        <button className="rounded-xl border border-navy-line px-3.5 py-2 text-sm font-bold disabled:opacity-40" disabled={demo.step === 0} onClick={() => go(demo.step - 1)}>Назад</button>
        {!here ? (
          <button className="flex-1 rounded-xl bg-white px-3.5 py-2 text-sm font-extrabold text-primary-ink" onClick={() => go(demo.step)}>Открыть этот экран</button>
        ) : demo.step < TOUR.length - 1 ? (
          <button className="flex-1 rounded-xl bg-primary px-3.5 py-2 text-sm font-extrabold text-white" onClick={() => go(demo.step + 1)}>Далее →</button>
        ) : (
          <button className="flex-1 rounded-xl bg-primary px-3.5 py-2 text-sm font-extrabold text-white" onClick={() => router.push("/demo#business")}>К бизнес-модели</button>
        )}
      </div>
      <div className="mt-3 flex justify-between text-xs text-navy-text">
        <span>Ученик и история — вымышленные</span>
        <button className="font-bold underline" onClick={() => { exitDemo(); router.push("/demo"); }}>Выйти из демо</button>
      </div>
    </aside>
  );
}
