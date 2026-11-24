"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import * as I from "@/components/icons";
import { load } from "@/lib/clientStore";
import {
  SECTION_TITLE, deviceInfo, fmtTime, hardModeAvailable, loadActive, pushHistory, saveActive, saveResult, seenQuestions,
  type ActiveAttempt, type AttemptPayload, type WritingResult,
} from "@/lib/mocks/client";
import type { Exam, Mode, MockResult, Section } from "@/lib/mocks/types";
import ReadingView from "./ReadingView";
import SatView from "./SatView";
import WritingView from "./WritingView";

type Phase = "rules" | "starting" | "running" | "submitting" | "interrupted" | "error";
type Violation = "fullscreen_exit" | "tab_hidden" | "blur" | "unload";

const VIOLATION_TEXT: Record<Violation, string> = {
  fullscreen_exit: "Вы вышли из полноэкранного режима.",
  tab_hidden: "Вы перешли в другую вкладку или свернули окно.",
  blur: "Окно теста потеряло фокус.",
  unload: "Страница была закрыта или перезагружена.",
};

export default function MockRunner({ exam, section, mode }: { exam: Exam; section: Section; mode: Mode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("rules");
  const [a, setA] = useState<ActiveAttempt | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [violation, setViolation] = useState<Violation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [canHard, setCanHard] = useState(true);
  const [ask, setAsk] = useState<string | null>(null);
  const aRef = useRef<ActiveAttempt | null>(null);
  const phaseRef = useRef<Phase>("rules");
  const qStart = useRef<number>(Date.now());
  const finishing = useRef(false);

  aRef.current = a;
  phaseRef.current = phase;

  const persist = useCallback((next: ActiveAttempt) => {
    setA(next);
    saveActive(next);
  }, []);

  // Восстановление: лёгкий режим продолжается; хард-попытка после перезагрузки уже прервана.
  useEffect(() => {
    setCanHard(hardModeAvailable());
    const act = loadActive();
    if (!act || act.exam !== exam || act.section !== section || act.mode !== mode) return;
    if (mode === "hard") {
      setA(act);
      setViolation("unload");
      setPhase("interrupted");
      pushHistory({ attemptId: act.att.attemptId, exam, section, mode, status: "interrupted", finishedAt: new Date().toISOString() });
      return;
    }
    setA(act);
    setPhase("running");
    qStart.current = Date.now();
  }, [exam, section, mode]);

  // Тик таймера.
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [phase]);

  // Мягкий таймер лёгкого режима.
  useEffect(() => {
    if (phase !== "running" || mode !== "light" || paused) return;
    const t = setInterval(() => {
      const cur = aRef.current;
      if (!cur) return;
      persist({ ...cur, lightRemaining: Math.max(0, cur.lightRemaining - 1) });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, mode, paused, persist]);

  const remaining = (() => {
    if (!a) return 0;
    if (mode === "light") return a.lightRemaining;
    const skew = a.att.serverNow - a.receivedAt;
    return a.att.deadlineAt ? (a.att.deadlineAt - (now + skew)) / 1000 : 0;
  })();

  const trackTime = useCallback((cur: ActiveAttempt): ActiveAttempt => {
    const q = cur.att.questions[cur.cur];
    if (!q) return cur;
    const spent = (Date.now() - qStart.current) / 1000;
    qStart.current = Date.now();
    return { ...cur, times: { ...cur.times, [q.id]: (cur.times[q.id] ?? 0) + spent } };
  }, []);

  // ───── Хард-режим: нарушение правил сразу завершает попытку ─────
  const interrupt = useCallback((type: Violation) => {
    const cur = aRef.current;
    if (!cur || phaseRef.current !== "running" || finishing.current || cur.mode !== "hard") return;
    finishing.current = true;
    const payload = JSON.stringify({ token: cur.att.token, type });
    try {
      navigator.sendBeacon("/api/mocks/event", new Blob([payload], { type: "text/plain" }));
    } catch {
      fetch("/api/mocks/event", { method: "POST", body: payload, keepalive: true }).catch(() => {});
    }
    setViolation(type);
    setPhase("interrupted");
    pushHistory({ attemptId: cur.att.attemptId, exam: cur.exam, section: cur.section, mode: "hard", status: "interrupted", finishedAt: new Date().toISOString() });
    if (type !== "unload" && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== "hard" || phase !== "running") return;
    const onFs = () => { if (!document.fullscreenElement) interrupt("fullscreen_exit"); };
    const onVis = () => { if (document.visibilityState === "hidden") interrupt("tab_hidden"); };
    const onBlur = () => interrupt("blur");
    const onHide = () => interrupt("unload");
    const block = (e: Event) => {
      const t = e.target as HTMLElement | null;
      // В IELTS Writing печатать можно, вставлять — нет.
      if (e.type !== "paste" && t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT") && e.type !== "copy" && e.type !== "cut") return;
      e.preventDefault();
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onHide);
    for (const ev of ["copy", "cut", "paste", "contextmenu"]) document.addEventListener(ev, block);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onHide);
      for (const ev of ["copy", "cut", "paste", "contextmenu"]) document.removeEventListener(ev, block);
    };
  }, [mode, phase, interrupt]);

  // ───── Старт ─────
  async function start() {
    setError(null);
    if (mode === "hard") {
      if (!hardModeAvailable()) return setError("Хард-режим доступен только в браузере на компьютере.");
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        return setError("Не удалось включить полноэкранный режим. Разрешите его в браузере и попробуйте снова.");
      }
    }
    setPhase("starting");
    try {
      const res = await fetch("/api/mocks/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ exam, section, mode, seen: seenQuestions(), device: deviceInfo(), profileId: load().profileId ?? null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error === "hard_desktop_only" ? "Хард-режим доступен только в браузере на компьютере." : json.error === "pro_required" ? "Этот режим доступен в Pro. Откройте раздел «Тарифы» — в тестовой версии Pro включается бесплатно." : "Не удалось начать мок.");
      const att = json as AttemptPayload;
      const act: ActiveAttempt = {
        exam, section, mode, att, receivedAt: Date.now(), answers: {}, times: {}, flags: [], cur: 0,
        lightRemaining: att.durationSec, essays: section === "writing" ? { task1: "", task2: "" } : undefined,
      };
      persist(act);
      qStart.current = Date.now();
      finishing.current = false;
      setPhase("running");
    } catch (e) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setError(e instanceof Error ? e.message : "Ошибка");
      setPhase("rules");
    }
  }

  // ───── Сдача модуля ─────
  const submitModule = useCallback(async () => {
    const cur0 = aRef.current;
    if (!cur0 || phaseRef.current !== "running") return;
    const cur = trackTime(cur0);
    setPhase("submitting");
    try {
      if (cur.section === "writing") {
        finishing.current = true;
        const res = await fetch("/api/mocks/writing", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: cur.att.token, ...cur.essays }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error === "interrupted" ? "Попытка уже прервана." : "Не удалось отправить работу.");
        const wr: WritingResult = { ...json, texts: cur.essays };
        saveResult(cur.att.attemptId, { kind: "writing", result: wr, finishedAt: new Date().toISOString(), mode: cur.mode });
        const bands = [wr.task1, wr.task2].filter(Boolean).map((t) => (t!.overallLow + t!.overallHigh) / 2);
        pushHistory({
          attemptId: cur.att.attemptId, exam: "ielts", section: "writing", mode: cur.mode, status: "completed", finishedAt: new Date().toISOString(),
          band: bands.length ? Math.round((bands.reduce((s, b) => s + b, 0) / bands.length) * 2) / 2 : undefined,
        });
        return done(cur.att.attemptId);
      }
      const res = await fetch("/api/mocks/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: cur.att.token, answers: cur.answers, times: cur.times, seen: seenQuestions() }),
      });
      const json = await res.json();
      if (res.status === 409 && json.error === "interrupted") {
        setViolation("unload");
        setPhase("interrupted");
        return;
      }
      if (!res.ok) throw new Error("Не удалось отправить ответы. Проверьте интернет — ответы сохранены.");
      if (json.next) {
        const next: ActiveAttempt = {
          ...cur, att: { ...cur.att, ...json.next }, receivedAt: Date.now(), answers: {}, times: {}, flags: [], cur: 0,
          lightRemaining: json.next.durationSec,
        };
        persist(next);
        qStart.current = Date.now();
        setNotice(`Модуль ${cur.att.module} завершён. Модуль ${json.next.module} — к модулю ${cur.att.module} вернуться нельзя.`);
        setTimeout(() => setNotice(null), 6000);
        setPhase("running");
        return;
      }
      finishing.current = true;
      const r = json.result as MockResult;
      saveResult(r.attemptId, { kind: "test", result: r, finishedAt: new Date().toISOString() });
      pushHistory(
        {
          attemptId: r.attemptId, exam: r.exam, section: r.section as "math" | "rw" | "reading", mode: r.mode, status: "completed",
          finishedAt: new Date().toISOString(), scoreLow: r.scoreLow, scoreHigh: r.scoreHigh, band: r.band, weakDomains: r.weakDomains,
        },
        r.review.map((x) => x.id),
      );
      done(r.attemptId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setPhase("running");
      finishing.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist, trackTime]);

  function done(id: string) {
    saveActive(null);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    router.push(`/mocks/result/${id}`);
  }

  // Время вышло → модуль завершается автоматически.
  useEffect(() => {
    if (phase === "running" && a && remaining <= 0) submitModule();
  }, [phase, a, remaining, submitModule]);

  async function reviewInterrupted() {
    const cur = aRef.current;
    if (!cur) return;
    saveActive(null);
    let review: MockResult["review"] | undefined;
    if (cur.section !== "writing") {
      const res = await fetch("/api/mocks/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: cur.att.token, answers: cur.answers }),
      }).catch(() => null);
      if (res?.ok) review = (await res.json()).review;
    }
    saveResult(cur.att.attemptId, { kind: "interrupted", attemptId: cur.att.attemptId, exam: cur.exam, section: cur.section, review, finishedAt: new Date().toISOString() });
    router.push(`/mocks/result/${cur.att.attemptId}`);
  }

  function newAttempt() {
    saveActive(null);
    setA(null);
    setViolation(null);
    finishing.current = false;
    setPhase("rules");
  }

  // ───── Обновление ответов ─────
  const setAnswer = (qid: string, v: string) => {
    const cur = aRef.current;
    if (cur) persist({ ...cur, answers: { ...cur.answers, [qid]: v } });
  };
  const goTo = (i: number) => {
    const cur = aRef.current;
    if (!cur) return;
    persist({ ...trackTime(cur), cur: Math.max(0, Math.min(cur.att.questions.length - 1, i)) });
  };
  const toggleFlag = (qid: string) => {
    const cur = aRef.current;
    if (!cur) return;
    persist({ ...cur, flags: cur.flags.includes(qid) ? cur.flags.filter((f) => f !== qid) : [...cur.flags, qid] });
  };
  const setEssay = (task: "task1" | "task2", text: string) => {
    const cur = aRef.current;
    if (cur) persist({ ...cur, essays: { ...(cur.essays ?? { task1: "", task2: "" }), [task]: text } });
  };

  // ───── Экраны ─────
  if (phase === "rules" || phase === "starting") {
    return <Rules exam={exam} section={section} mode={mode} canHard={canHard} error={error} busy={phase === "starting"} onStart={start} />;
  }

  if (phase === "interrupted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgba(14,26,58,.72)] p-6">
        <div role="alertdialog" aria-labelledby="stopT" className="max-w-[460px] rounded-[28px] bg-surface p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-soft">
            <I.Close size={30} color="#B2461A" />
          </div>
          <h2 id="stopT" className="mt-5 text-[28px] font-extrabold">Попытка прервана</h2>
          <p className="mt-3 text-base leading-relaxed text-body">
            {violation ? VIOLATION_TEXT[violation] : ""} В хард-режиме это завершает попытку — балл не засчитан. Ответы сохранены для разбора.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <button className="btn-primary" onClick={newAttempt}>Новая попытка</button>
            <button className="btn-secondary" onClick={reviewInterrupted}>Разбор ответов</button>
          </div>
        </div>
      </div>
    );
  }

  if (!a) return null;
  const isWriting = section === "writing";
  const total = a.att.questions.length;
  const answered = a.att.questions.filter((q) => (a.answers[q.id] ?? "") !== "").length;
  const low = remaining < 300;

  return (
    <div className={mode === "hard" ? "no-select min-h-screen bg-bg" : "min-h-screen bg-bg"}>
      <header className="flex flex-wrap items-center justify-between gap-4 bg-inv px-4 py-3.5 text-white sm:px-7">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="font-extrabold">{SECTION_TITLE[section]}</span>
          {exam === "sat" && <span className="text-sm text-navy-text">Модуль {a.att.module} из {a.att.totalModules}</span>}
          <span className={`rounded-lg px-2.5 py-1 text-[13px] font-extrabold ${mode === "hard" ? "bg-orange" : "bg-navy-2"}`}>
            {mode === "hard" ? "Хард-режим" : "Лёгкий режим"}
          </span>
        </div>
        <div className={`flex items-center gap-2.5 text-[22px] font-extrabold tabular-nums ${low ? "text-peach" : ""}`} aria-live="off">
          <I.Timer size={20} color="#F6B48E" />
          <span>{fmtTime(remaining)}</span>
          {mode === "light" && (
            <button
              onClick={() => setPaused(!paused)}
              className="ml-2 rounded-lg border border-navy-line px-2.5 py-1 text-[13px] font-bold"
            >
              {paused ? "Продолжить" : "Пауза"}
            </button>
          )}
        </div>
        <button
          onClick={() => {
            const unanswered = isWriting ? 0 : total - answered;
            const msg = isWriting
              ? "Отправить работу на оценку?"
              : unanswered > 0
                ? `Без ответа осталось ${unanswered}. Завершить модуль? ${exam === "sat" && a.att.module < a.att.totalModules ? "К этому модулю вернуться будет нельзя." : ""}`
                : "Завершить модуль?";
            setAsk(msg);
          }}
          disabled={phase === "submitting"}
          className="rounded-[10px] border border-navy-line bg-transparent px-3.5 py-2 text-sm font-bold text-white"
        >
          {phase === "submitting" ? (isWriting ? "ИИ оценивает… до минуты" : "Отправляем…") : isWriting ? "Сдать работу" : exam === "sat" && a.att.module < a.att.totalModules ? "Завершить модуль" : "Завершить тест"}
        </button>
      </header>

      {mode === "hard" && (
        <div className="flex flex-wrap items-center gap-2.5 bg-orange-soft px-4 py-2.5 text-sm font-semibold text-orange-ink-2 sm:px-7">
          <I.Warn />
          Выход из полноэкранного режима, переход в другую вкладку или закрытие страницы сразу завершит попытку без балла.
        </div>
      )}
      {notice && <div className="bg-primary-soft px-4 py-2.5 text-sm font-semibold text-primary-ink sm:px-7">{notice}</div>}
      {error && <div className="bg-red-soft px-4 py-2.5 text-sm font-semibold text-red sm:px-7">{error}</div>}

      {paused ? (
        <div className="mx-auto mt-16 max-w-md p-6 text-center">
          <div className="card space-y-4">
            <h2 className="text-xl font-extrabold">Пауза</h2>
            <p className="text-body">Таймер остановлен. Вопросы скрыты, пока пауза включена.</p>
            <button className="btn-primary" onClick={() => setPaused(false)}>Продолжить</button>
          </div>
        </div>
      ) : section === "reading" ? (
        <ReadingView a={a} setAnswer={setAnswer} goTo={goTo} toggleFlag={toggleFlag} />
      ) : isWriting ? (
        <WritingView a={a} setEssay={setEssay} hard={mode === "hard"} />
      ) : (
        <SatView
          a={a}
          setAnswer={setAnswer}
          goTo={goTo}
          toggleFlag={toggleFlag}
          onFinish={() => {
            const left = total - answered;
            setAsk(left > 0 ? `Без ответа осталось ${left}. Завершить модуль?` : "Завершить модуль?");
          }}
        />
      )}

      {ask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(14,26,58,.55)] p-6">
          <div role="alertdialog" aria-labelledby="askT" className="max-w-[420px] rounded-[24px] bg-surface p-8 text-center">
            <h2 id="askT" className="text-xl font-extrabold">{ask}</h2>
            <div className="mt-6 flex justify-center gap-2.5">
              <button className="btn-secondary" onClick={() => setAsk(null)}>Вернуться</button>
              <button
                className="btn-primary"
                onClick={() => {
                  setAsk(null);
                  submitModule();
                }}
              >
                Да, завершить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Rules(props: { exam: Exam; section: Section; mode: Mode; canHard: boolean; error: string | null; busy: boolean; onStart: () => void }) {
  const { section, mode } = props;
  const spec =
    section === "math" ? "2 адаптивных модуля по 22 вопроса, 35 минут на модуль." :
    section === "rw" ? "2 адаптивных модуля по 27 вопросов, 32 минуты на модуль." :
    section === "reading" ? "3 текста, 40 вопросов, 60 минут." :
    "Task 1 (от 150 слов) и Task 2 (от 250 слов), 60 минут на обе части.";
  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto max-w-[720px] space-y-6">
        <Link href="/mocks" className="text-sm font-bold text-primary">← К мокам</Link>
        <div className="card space-y-5">
          <div>
            <div className="eyebrow">{mode === "hard" ? "ХАРД-РЕЖИМ" : "ЛЁГКИЙ РЕЖИМ"}</div>
            <h1 className="mt-2 text-[32px] font-extrabold tracking-tight">{SECTION_TITLE[section]}</h1>
            <p className="mt-2 text-body">{spec}</p>
          </div>
          {props.exam === "sat" && (
            <p className="text-sm text-body">
              Второй модуль собирается по результату первого: лёгкая или сложная ветка. Внутри модуля можно возвращаться к вопросам и ставить флажок, к прошлому модулю — нельзя.
            </p>
          )}
          {mode === "light" ? (
            <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-body">
              <li>Мягкий таймер, можно поставить паузу.</li>
              <li>Подсказка и разбор сразу после ответа.</li>
              <li>Работает на телефоне и в Telegram.</li>
              <li>Балл тренировочный и в профиль не идёт.</li>
            </ul>
          ) : (
            <>
              <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-body">
                <li>Жёсткий таймер на сервере: перезагрузка не сбрасывает время.</li>
                <li>Обязателен полноэкранный режим.</li>
                <li><b className="text-ink">Выход из полного экрана, переход в другую вкладку, сворачивание или закрытие страницы сразу завершают попытку без балла.</b></li>
                <li>Копирование, вставка и правый клик запрещены.</li>
                <li>Разбор — только после завершения. Результат идёт в Profile Strength с пометкой «по моку».</li>
              </ul>
              <p className="rounded-xl bg-bg px-4 py-3 text-sm text-muted">
                Честно: хард-режим не видит телефон в руках, второе устройство и скриншоты. Это тренировка самодисциплины, а не прокторинг.
              </p>
              {!props.canHard && (
                <p className="rounded-xl bg-orange-soft px-4 py-3 text-sm font-semibold text-orange-ink-2">
                  Хард-режим доступен только в браузере на компьютере. На телефоне и в Telegram пройдите мок в лёгком режиме.
                </p>
              )}
            </>
          )}
          <p className="text-sm text-muted">Балл мока — примерная оценка диапазоном, а не официальный результат.</p>
          {props.error && <p className="rounded-xl bg-red-soft px-4 py-3 text-sm font-semibold text-red">{props.error}</p>}
          <div className="flex flex-wrap gap-2.5">
            <button className="btn-primary" disabled={props.busy || (mode === "hard" && !props.canHard)} onClick={props.onStart}>
              {props.busy ? "Готовим вопросы…" : mode === "hard" ? "Войти в полный экран и начать" : "Начать мок"}
            </button>
            <Link href="/mocks" className="btn-secondary">Отмена</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
