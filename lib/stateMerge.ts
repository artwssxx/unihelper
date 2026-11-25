import type { Stored } from "./clientStore";

// Слияние данных ученика: браузер + аккаунт. Ничего не теряем:
// истории и списки объединяем, для профиля берём аккаунт, если он там есть.
const byKey = <T,>(a: T[] = [], b: T[] = [], key: (x: T) => string) => {
  const m = new Map<string, T>();
  for (const x of [...a, ...b]) m.set(key(x), { ...(m.get(key(x)) ?? {}), ...x });
  return [...m.values()];
};

export function mergeStates(local: Stored, remote: Stored): Stored {
  const l = local.demo?.active ? {} : local; // демо в аккаунт не переносим
  return {
    ...l,
    ...remote,
    profile: remote.profile ?? l.profile,
    contact: remote.contact ?? l.contact,
    profileId: remote.profileId ?? l.profileId,
    myPrograms: [...new Set([...(remote.myPrograms ?? []), ...(l.myPrograms ?? [])])],
    roadmap: { ...(l.roadmap ?? {}), ...(remote.roadmap ?? {}) },
    customSteps: byKey(remote.customSteps, l.customSteps, (x) => x.id),
    mocks: byKey(remote.mocks, l.mocks, (x) => x.attemptId),
    events: { ...(l.events ?? {}), ...(remote.events ?? {}) },
    lessons: { ...(l.lessons ?? {}), ...(remote.lessons ?? {}) },
    essays: byKey(remote.essays, l.essays, (x) => x.id),
    scores: byKey(remote.scores, l.scores, (x) => x.id),
    portfolio: remote.portfolio ?? l.portfolio,
    seenQuestions: [...new Set([...(remote.seenQuestions ?? []), ...(l.seenQuestions ?? [])])].slice(-3000),
    customUnis: byKey(remote.customUnis, l.customUnis, (x) => x.id),
    demo: undefined,
  };
}
