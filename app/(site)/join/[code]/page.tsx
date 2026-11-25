"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import LoginCard from "@/components/auth/LoginCard";
import * as I from "@/components/icons";
import { apiFetch, useAuth } from "@/lib/auth";

// Приглашение от родителя: ребёнок входит (Telegram, Google, почта) и принимает — родитель начинает видеть прогресс.
export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { ready, user } = useAuth();
  const [info, setInfo] = useState<{ parentName: string; childName: string } | null | undefined>(undefined);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/family/claim?code=${encodeURIComponent(code)}`).then(async (r) => setInfo(r.ok ? await r.json() : null)).catch(() => setInfo(null));
  }, [code]);

  async function accept() {
    setState("busy");
    const r = await apiFetch("/api/family/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) {
      setState("error");
      return setMsg(j.message ?? "Не получилось принять приглашение.");
    }
    setState("done");
    // Анкета, заполненная родителем, уже в аккаунте — подтягиваем её и открываем кабинет.
    setTimeout(() => (location.href = "/dashboard"), 1200);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-10">
      <div className="flex items-center gap-2.5"><I.Logo /><span className="text-xl font-extrabold">UniHelper</span></div>
      {info === undefined ? (
        <div className="h-40 animate-pulse rounded-[24px] bg-line-3" role="status" aria-label="Загружаем" />
      ) : info === null ? (
        <div className="card space-y-3">
          <p className="font-semibold">Приглашение не найдено или уже принято.</p>
          <button className="btn-primary" onClick={() => router.push("/dashboard")}>Открыть UniHelper</button>
        </div>
      ) : (
        <>
          <div className="card space-y-2">
            <h1 className="text-2xl font-extrabold leading-tight"><span translate="no">{info.childName}</span>, тебя пригласили в UniHelper</h1>
            <p className="text-sm text-body">
              <b translate="no">{info.parentName}</b> заполнил(а) за тебя анкету: сила профиля, подбор вузов и план уже готовы. Войди — и родитель будет видеть твой прогресс (без переписки и текстов эссе). Отключить можно в профиле в любой момент.
            </p>
          </div>
          {!ready ? null : user ? (
            <div className="card space-y-3">
              {state === "done" ? (
                <p className="font-semibold text-green">Готово! Открываем твой кабинет…</p>
              ) : (
                <>
                  <button className="btn-primary w-full" disabled={state === "busy"} onClick={accept}>{state === "busy" ? "Принимаем…" : "Принять приглашение"}</button>
                  {msg && <p className="text-sm font-semibold text-red">{msg}</p>}
                </>
              )}
            </div>
          ) : (
            <LoginCard next={`/join/${code}`} mode="register" signupHint={false} />
          )}
        </>
      )}
    </div>
  );
}
