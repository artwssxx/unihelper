"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startDemo } from "@/lib/demo";

export default function StartDemoButton({ light = false }: { light?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(false);
          try {
            await startDemo();
            router.push("/dashboard");
          } catch {
            setErr(true);
            setBusy(false);
          }
        }}
        className={`rounded-[14px] px-6 py-4 text-base font-extrabold disabled:opacity-60 ${light ? "bg-white text-primary-ink" : "bg-primary text-white hover:bg-primary-ink"}`}
      >
        {busy ? "Готовим демо…" : "Запустить живое демо"}
      </button>
      {err && <p className="mt-2 text-sm text-peach">Не удалось загрузить демо. Попробуйте ещё раз.</p>}
    </div>
  );
}
