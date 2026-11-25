import { rng } from "@/lib/mocks/bank/satMath";
import {
  buildReadingTest, buildResult, buildSatModule1, buildSatModule2, getQuestion, gradeIds, module2Path, type ModuleRecord,
} from "@/lib/mocks/engine";
import { ruleCheck } from "@/lib/essayRules";
import type { MockResult } from "@/lib/mocks/types";

// Демо для инвесторов: ВЫМЫШЛЕННЫЙ ученик. История моков считается настоящим движком
// (ответы смоделированы с заданной точностью по сложности), чтобы разбор и балл были реальными расчётами.

const monthsAgo = (n: number, day = 14) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n, day);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
};

function simulate(ids: string[], acc: Record<number, number>, r: () => number, wrongPick = "Z") {
  const answers: Record<string, string> = {};
  const times: Record<string, number> = {};
  for (const id of ids) {
    const q = getQuestion(id)!;
    const ok = r() < (acc[q.difficulty] ?? 0.7);
    if (q.answerType === "mcq") {
      const letters = "ABCDEFGH".slice(0, q.choices!.length).split("").filter((l) => l !== q.answer);
      answers[id] = ok ? q.answer : letters[Math.floor(r() * letters.length)] ?? wrongPick;
    } else if (q.answerType === "spr") {
      answers[id] = ok ? q.answer : String(Number(q.answer) + 1);
    } else {
      answers[id] = ok ? q.answer : "no idea";
    }
    times[id] = 35 + Math.round(r() * 70);
  }
  return { answers, times };
}

function satAttempt(id: string, section: "math" | "rw", acc: Record<number, number>, seed: number): MockResult {
  const r = rng(seed);
  const m1 = buildSatModule1(section, new Set(), r);
  const s1 = simulate(m1, acc, r);
  const path = module2Path(gradeIds(m1, s1.answers).fraction);
  const m2 = buildSatModule2(section, path, new Set(m1), new Set(), r);
  const s2 = simulate(m2, acc, r);
  const modules: ModuleRecord[] = [
    { module: 1, qids: m1, ...s1 },
    { module: 2, qids: m2, ...s2 },
  ];
  return buildResult({ attemptId: id, exam: "sat", section, mode: "hard", modules, path });
}


// ── Дневник демо-ученика (вымышленный, как и весь демо-профиль): расписание вокруг сегодняшнего дня ──
const DEMO_TT: Record<number, string[]> = {
  1: ["Математика", "Информатика", "Английский язык", "Физика", "История"],
  2: ["Родной язык", "Математика", "Химия", "Литература", "Физкультура"],
  3: ["Физика", "Английский язык", "Математика", "Информатика", "История"],
  4: ["Математика", "Литература", "Родной язык", "Химия", "Английский язык"],
  5: ["Информатика", "Физика", "Математика", "Физкультура", "Английский язык"],
  6: ["История", "Родной язык", "Математика", "Информатика"],
};
const DEMO_SUBJ: [string, string, number, boolean?][] = [
  ["Математика", "math", 4.7, true], ["Информатика", "informatics", 5, true], ["Физика", "physics", 4.4], ["Английский язык", "english", 4.8],
  ["Родной язык", "native", 4.3], ["История", "history", 4.5], ["Литература", "literature", 4.2], ["Химия", "chemistry", 4.0], ["Физкультура", "pe", 5],
];
const TIMES = [["08:00", "08:45"], ["08:55", "09:40"], ["09:50", "10:35"], ["10:50", "11:35"], ["11:45", "12:30"], ["12:40", "13:25"]];
const HW: Record<string, string> = { "Математика": "№ 214–218, повторить производные", "Физика": "§ 23, задачи 3 и 5", "Английский язык": "Essay: 150 words about your hobby", "Информатика": "Доделать программу сортировки", "История": "§ 15, конспект", "Литература": "Прочитать главы 3–4" };

function demoDiary(now: Date) {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) - 7);
  const today = iso(now);
  const days = [];
  let k = 0;
  for (let i = 0; i < 28; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const wd = d.getDay();
    if (!DEMO_TT[wd]) continue;
    const date = iso(d);
    days.push({
      date,
      lessons: DEMO_TT[wd].map((subject, n) => {
        k++;
        const past = date <= today;
        return {
          n: n + 1, start: TIMES[n][0], end: TIMES[n][1], subject, room: String(201 + n), kind: k % 11 === 0 ? "Контрольная" : null,
          topic: past || date <= iso(new Date(now.getTime() + 7 * 86400000)) ? `Тема урока ${((k * 7) % 40) + 1}` : null,
          homework: HW[subject] && k % 2 === 0 ? HW[subject] : null, homeworkUrl: null,
          marks: past && k % 3 === 0 ? [k % 5 === 0 ? 4 : 5] : [], absent: date < today && k % 37 === 0,
        };
      }),
    });
  }
  const absItems = days.flatMap((d) => d.lessons.filter((l) => l.absent).map((l) => ({ date: d.date, subject: l.subject })));
  const subjects = DEMO_SUBJ.map(([subject, key, grade, special], i) => ({
    subject, key, grade, ...(special ? { special: true } : {}),
    parts: [
      { name: "Ответ на уроке", avg: Math.min(5, grade + 0.1), marks: [0, 1, 2, 3].map((j) => ({ date: iso(new Date(now.getTime() - (j * 9 + i + 3) * 86400000)), value: j === 2 && grade < 4.5 ? 4 : 5 })) },
      { name: "Контрольная работа", avg: Math.max(3, grade - 0.3), marks: [{ date: iso(new Date(now.getTime() - (20 + i) * 86400000)), value: grade >= 4.6 ? 5 : 4 }] },
    ],
  }));
  return {
    diary: {
      source: "emaktab" as const, fetchedAt: now.toISOString(), period: "2026/27 учебный год (пример)", school: "[Пример] Школа № 1", className: "11-А",
      subjects, days, absences: { total: absItems.length + 3, items: [...absItems, { date: iso(new Date(now.getTime() - 30 * 86400000)), subject: "Химия" }, { date: iso(new Date(now.getTime() - 31 * 86400000)), subject: "Химия" }, { date: iso(new Date(now.getTime() - 45 * 86400000)), subject: "Литература" }] },
    },
    grades: { items: subjects.map((x) => ({ subject: x.subject, key: x.key, grade: x.grade, ...(x.special ? { special: true } : {}) })), scale: 5 as const, source: "emaktab" as const, updatedAt: now.toISOString(), period: "2026/27 учебный год (пример)", useForGpa: true },
  };
}

export function buildDemo() {
  const math = satAttempt("demo-sat-math", "math", { 1: 0.95, 2: 0.82, 3: 0.62 }, 1101);
  const rw = satAttempt("demo-sat-rw", "rw", { 1: 0.92, 2: 0.74, 3: 0.5 }, 2202);
  const rd = (() => {
    const r = rng(3303);
    const ids = buildReadingTest();
    const s = simulate(ids, { 1: 0.9, 2: 0.75, 3: 0.55 }, r);
    return buildResult({ attemptId: "demo-ielts-reading", exam: "ielts", section: "reading", mode: "hard", modules: [{ module: 1, qids: ids, ...s }] });
  })();

  const essayText =
    "С детства мечтал стать программистом. В 9 классе я собрал команду из 4 друзей, и за 3 месяца мы сделали сайт для школы: сейчас им пользуются 600 учеников и учителей.\n\nСамым трудным оказалось не программирование, а договориться с завучем о том, какие данные можно публиковать. Я впервые написал документ с правилами и защитил его на педсовете.\n\nЯ хочу изменить мир с помощью технологий, начиная со своей школы.";

  const dd = demoDiary(new Date());
  const state = {
    demo: { active: true, step: 0, tour: true },
    diary: dd.diary,
    profile: {
      grade: 11, city: "Ташкент", gpa: 4.6, gpaScale: 5, ielts: 6.5, sat: null,
      achievementsText: "Призёр областной олимпиады по информатике, 2 место на школьном хакатоне, сайт для школы (600 пользователей), волонтёр: уроки английского для младших",
      bestAchievementLevel: "city", activitiesCount: 4, ledSomething: true,
      targetCountries: ["HU", "KR", "US", "UZ"], major: "cs", budgetUsd: 6000,
      essays: "ok", recommendations: "ok",
      grades: dd.grades,
    },
    contact: { fullName: "Азиз Каримов", phone: "+998 90 000 00 00", email: "" },
    profileId: null,
    myPrograms: ["sh-elte", "gks-ug", "kaist", "inha"],
    roadmap: { volunteer: "done", "lesson-essay": "done", "event-major": "done", "sat-mock": "done", "ielts-mock": "done", "essay-draft": "doing", recs: "doing" },
    mocks: [
      { attemptId: "demo-h1", exam: "sat", section: "math", mode: "hard", status: "completed", finishedAt: monthsAgo(2, 10), scoreLow: 480, scoreHigh: 540 },
      { attemptId: "demo-h2", exam: "sat", section: "rw", mode: "hard", status: "completed", finishedAt: monthsAgo(2, 12), scoreLow: 450, scoreHigh: 510 },
      { attemptId: "demo-h3", exam: "sat", section: "math", mode: "hard", status: "interrupted", finishedAt: monthsAgo(1, 3) },
      { attemptId: "demo-h4", exam: "sat", section: "math", mode: "hard", status: "completed", finishedAt: monthsAgo(1, 8), scoreLow: 530, scoreHigh: 590 },
      { attemptId: "demo-h5", exam: "sat", section: "rw", mode: "hard", status: "completed", finishedAt: monthsAgo(1, 10), scoreLow: 480, scoreHigh: 540 },
      { attemptId: math.attemptId, exam: "sat", section: "math", mode: "hard", status: "completed", finishedAt: monthsAgo(0, 1), scoreLow: math.scoreLow, scoreHigh: math.scoreHigh, weakDomains: math.weakDomains },
      { attemptId: rw.attemptId, exam: "sat", section: "rw", mode: "hard", status: "completed", finishedAt: monthsAgo(0, 2), scoreLow: rw.scoreLow, scoreHigh: rw.scoreHigh, weakDomains: rw.weakDomains },
      { attemptId: rd.attemptId, exam: "ielts", section: "reading", mode: "hard", status: "completed", finishedAt: monthsAgo(0, 3), band: rd.band, weakDomains: rd.weakDomains },
    ],
    seenQuestions: [...math.review, ...rw.review, ...rd.review].map((x) => x.id),
    events: { "ev-hack": { status: "registered", ticket: "demo-ticket-0001", sharedFields: ["name", "grade"], at: monthsAgo(0, 5) } },
    lessons: { "l-linear": { watched: true, quizScore: 1 }, "l-punctuation": { watched: true, quizScore: 0.67 } },
    essays: [{ id: "demo-essay-1", prompt: "Личное эссе (Common App): расскажите историю, без которой ваша заявка была бы неполной.", text: essayText, at: monthsAgo(0, 4), feedback: ruleCheck(essayText) }],
    portfolio: {
      slug: "aziz", template: "creative", visibility: "draft",
      about: "Я учусь в 11 классе в Ташкенте и хочу изучать Computer Science. Вместе с друзьями сделал сайт для своей школы, участвую в олимпиадах по информатике и веду уроки английского для младших.",
      sections: { about: true, projects: true, achievements: true, activities: true, contact: false },
      showFields: { phone: false, email: false, city: true, scores: false },
      projects: [
        { title: "Сайт для школы", text: "Команда из 4 человек, 3 месяца работы; сайтом пользуются ученики и учителя." },
        { title: "Школьный хакатон", text: "2 место: прототип приложения для расписания кружков." },
      ],
    },
  };
  const results = {
    [math.attemptId]: { kind: "test", result: math, finishedAt: monthsAgo(0, 1) },
    [rw.attemptId]: { kind: "test", result: rw, finishedAt: monthsAgo(0, 2) },
    [rd.attemptId]: { kind: "test", result: rd, finishedAt: monthsAgo(0, 3) },
  };
  return { state, results };
}
