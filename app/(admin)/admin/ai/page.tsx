"use client";

import { useEffect, useState } from "react";

// Какие ИИ подключены и работают ли они. Ключи задаются переменными окружения в Vercel (Settings → Environment Variables).
const ALL = [
  { name: "gemini", env: "GEMINI_API_KEY", where: "aistudio.google.com/apikey", note: "основной: лучше всех пишет по-узбекски, читает картинки" },
  { name: "groq", env: "GROQ_API_KEY", where: "console.groq.com/keys", note: "очень быстрый, gpt-oss-120b; ≈ 1000 запросов в день бесплатно" },
  { name: "mistral", env: "MISTRAL_API_KEY", where: "console.mistral.ai/api-keys", note: "бесплатный тариф (нужен телефон), читает картинки" },
  { name: "github", env: "GITHUB_MODELS_TOKEN", where: "github.com/settings/tokens (scope models:read)", note: "GPT-4.1 бесплатно с лимитом на день, читает картинки" },
  { name: "openrouter", env: "OPENROUTER_API_KEY", where: "openrouter.ai/keys", note: "бесплатные модели «:free», ≈ 50 запросов в день" },
  { name: "cerebras", env: "CEREBRAS_API_KEY", where: "cloud.cerebras.ai", note: "очень быстрый; условия бесплатного тарифа меняются" },
  { name: "sambanova", env: "SAMBANOVA_API_KEY", where: "cloud.sambanova.ai/apis", note: "Llama 3.3 70B, бесплатные лимиты" },
  { name: "anthropic", env: "ANTHROPIC_API_KEY", where: "console.anthropic.com", note: "Claude — платный, самый качественный" },
];

export default function AdminAi() {
  const [st, setSt] = useState<{ providers: string[]; chain: string | null } | null>(null);
  const [res, setRes] = useState<Record<string, { ok: boolean; ms?: number; sample?: string | null; error?: string } | "busy">>({});
  useEffect(() => {
    fetch("/api/admin/ai", { cache: "no-store" }).then((r) => r.json()).then(setSt).catch(() => setSt({ providers: [], chain: null }));
  }, []);
  async function check(name: string) {
    setRes((x) => ({ ...x, [name]: "busy" }));
    const r = await fetch("/api/admin/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }).then((x) => x.json()).catch(() => ({ ok: false, error: "нет связи" }));
    setRes((x) => ({ ...x, [name]: r }));
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight">ИИ-провайдеры</h1>
        <p className="mt-1 max-w-[760px] text-sm text-body">
          Запрос идёт к первому провайдеру цепочки; если он перегружен или упёрся в лимит — к следующему (а сам перегруженный минуту стоит в конце очереди).
          Чтобы подключить провайдера, добавьте его ключ в Vercel → Settings → Environment Variables и сделайте Redeploy. Порядок запасных — переменная <code>AI_FALLBACKS</code>.
        </p>
        <p className="mt-2 text-sm font-semibold">Цепочка сейчас: {st ? st.chain ?? "ИИ не настроен" : "…"}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {ALL.map((p) => {
          const on = st?.providers.includes(p.name);
          const r = res[p.name];
          return (
            <div key={p.name} className="card space-y-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <b className="text-lg">{p.name}</b>
                <span className={`pill ${on ? "bg-green-soft text-green" : "bg-line-3 text-muted"}`}>{on ? "подключён" : "нет ключа"}</span>
              </div>
              <p className="text-sm text-body">{p.note}</p>
              <p className="text-xs text-muted">Переменная <code>{p.env}</code> · ключ: {p.where}</p>
              {on && <button className="btn-secondary py-2 text-sm" disabled={r === "busy"} onClick={() => check(p.name)}>{r === "busy" ? "Проверяем…" : "Проверить"}</button>}
              {r && r !== "busy" && (
                <p className={`text-sm font-semibold ${r.ok ? "text-green" : "text-red"}`}>
                  {r.ok ? `Работает · ${r.ms} мс${r.sample ? ` · «${r.sample}»` : ""}` : `Ошибка${r.ms ? ` за ${r.ms} мс` : ""}: ${r.error}`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
