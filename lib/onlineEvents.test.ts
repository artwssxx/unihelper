import { describe, expect, it } from "vitest";
import { parseCodechef, parseCodeforces, parseDevpost, parseDevpostDates, rankOnlineEvents, type OnlineEvent } from "./onlineEvents";

const NOW = Date.parse("2026-11-25T10:00:00Z");

describe("источники онлайн-ивентов", () => {
  it("Codeforces: только будущие, Div. 3/4 — для начинающих", () => {
    const r = parseCodeforces({ status: "OK", result: [
      { id: 2100, name: "Codeforces Round 990 (Div. 3)", phase: "BEFORE", startTimeSeconds: NOW / 1000 + 86400 * 3, durationSeconds: 8100 },
      { id: 2099, name: "Codeforces Round 989 (Div. 1)", phase: "FINISHED", startTimeSeconds: NOW / 1000 - 86400 },
    ] }, NOW);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: "cf-2100", beginner: true, url: "https://codeforces.com/contests/2100", note: "2.3 ч · для начинающих" });
  });
  it("CodeChef: future_contests", () => {
    const r = parseCodechef({ future_contests: [{ contest_code: "START200", contest_name: "Starters 200", contest_start_date_iso: "2026-11-26T20:00:00+05:30", contest_end_date_iso: "2026-11-26T22:00:00+05:30", contest_duration: "120" }] }, NOW);
    expect(r[0]).toMatchObject({ id: "cc-START200", beginner: true, note: "2 ч · все уровни" });
  });
  it("CodeChef: дата без ISO (время Индии)", () => {
    const r = parseCodechef({ future_contests: [{ contest_code: "START201", contest_name: "Starters 201", contest_start_date: "03 Dec 2026  20:00:00", contest_duration: "120" }] }, NOW);
    expect(r[0].startsAt).toBe("2026-12-03T14:30:00.000Z");
    expect(r[0].endsAt).toBeNull();
  });
  it("Devpost: даты, темы → направления, только онлайн и не по приглашениям", () => {
    expect(parseDevpostDates("Nov 20 - Dec 15, 2026")).toEqual(["2026-11-20T12:00:00.000Z", "2026-12-15T12:00:00.000Z"]);
    expect(parseDevpostDates("Dec 01 - 03, 2026")).toEqual(["2026-12-01T12:00:00.000Z", "2026-12-03T12:00:00.000Z"]);
    expect(parseDevpostDates("Dec 28 - Jan 10, 2027")![0]).toBe("2026-12-28T12:00:00.000Z");
    const r = parseDevpost({ hackathons: [
      { id: 1, title: "HealthHack", url: "https://healthhack.devpost.com/", open_state: "open", submission_period_dates: "Nov 20 - Dec 15, 2026", themes: [{ name: "Health" }, { name: "Beginner Friendly" }], prize_amount: "$<span data-currency-value>5,000</span>", displayed_location: { location: "Online" } },
      { id: 2, title: "Closed", url: "https://x.devpost.com/", submission_period_dates: "Oct 1 - 10, 2026", themes: [] },
      { id: 3, title: "Invite", url: "https://y.devpost.com/", invite_only: true, submission_period_dates: "Dec 1 - 20, 2026" },
      { id: 4, title: "In person", url: "https://z.devpost.com/", submission_period_dates: "Dec 1 - 20, 2026", displayed_location: { location: "Boston, MA" } },
    ] }, NOW);
    expect(r.map((e) => e.id)).toEqual(["dp-1"]);
    expect(r[0].majors).toEqual(expect.arrayContaining(["medicine", "cs"]));
    expect(r[0].note).toBe("призы $5,000 · для начинающих · приём заявок открыт");
  });
});

describe("подбор под профиль", () => {
  const ev = (over: Partial<OnlineEvent>): OnlineEvent => ({ id: "x", source: "devpost", title: "x", url: "https://x", kind: "hackathon", startsAt: "2026-12-01T12:00:00Z", endsAt: "2026-12-10T12:00:00Z", majors: ["cs"], organizer: "o", note: null, beginner: false, ...over });
  const base = { major: "medicine" as const, majors: ["medicine" as const, "cs" as const], grade: 9, activitiesCount: 1, bestAchievementLevel: "school" as const };

  it("основное направление важнее второго; чужие направления не предлагаем", () => {
    const r = rankOnlineEvents([ev({ id: "cs", majors: ["cs"] }), ev({ id: "med", majors: ["medicine"] }), ev({ id: "design", majors: ["design"] })], base, NOW);
    expect(r.map((e) => e.id)).toEqual(["med", "cs"]);
    expect(r[0].reasons[0]).toBe("по направлению «медицина»");
  });
  it("младшим — для начинающих; мало активностей — польза для портфолио; прошедшие отбрасываем", () => {
    const r = rankOnlineEvents([ev({ id: "easy", beginner: true }), ev({ id: "old", startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-10-02T00:00:00Z" })], { ...base, major: "cs", majors: ["cs"] }, NOW);
    expect(r.map((e) => e.id)).toEqual(["easy"]);
    expect(r[0].reasons).toEqual(expect.arrayContaining(["для начинающих", "даст результат для портфолио"]));
  });
  it("не больше четырёх ивентов подряд из одного внешнего источника", () => {
    const many = Array.from({ length: 8 }, (_, i) => ev({ id: `cf${i}`, source: "codeforces", kind: "contest" }));
    expect(rankOnlineEvents(many, { ...base, major: "cs", majors: ["cs"] }, NOW)).toHaveLength(4);
  });
});
