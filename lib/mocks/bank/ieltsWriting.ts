import { rng } from "./satMath";

// IELTS Academic Writing — оригинальные учебные задания. Данные в Task 1 вымышленные (учебные).

export const WRITING_TEST_ID = "ielts-writing-1";

export const TASK1 = {
  title: "Writing Task 1",
  minutes: 20,
  minWords: 150,
  prompt:
    "The chart below shows the percentage of residents in four cities who used public transport on a typical weekday in 2010 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
  chart: {
    unit: "%",
    series: ["2010", "2020"],
    categories: [
      { label: "City A", values: [34, 52] },
      { label: "City B", values: [61, 58] },
      { label: "City C", values: [22, 41] },
      { label: "City D", values: [45, 47] },
    ],
  },
};

export const TASK2 = {
  title: "Writing Task 2",
  minutes: 40,
  minWords: 250,
  prompt:
    "Some people believe that universities should focus mainly on preparing students for employment. Others think that the purpose of higher education is much broader.\n\nDiscuss both views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.",
};

// ── Генерация: каждая попытка — новая диаграмма Task 1 и новая тема Task 2 ──
// Task 1 — данные вымышленные (учебные), строятся по сиду; Task 2 — свои формулировки.


type Chart = { unit: string; series: string[]; categories: { label: string; values: number[] }[] };
export type WritingTask = { title: string; minutes: number; minWords: number; prompt: string; chart?: Chart };

const T1_TOPICS: { what: string; unit: string; cats: string[]; range: [number, number] }[] = [
  { what: "the percentage of households in four countries that had access to high-speed internet", unit: "%", cats: ["Country A", "Country B", "Country C", "Country D"], range: [20, 95] },
  { what: "the share of electricity generated from renewable sources in four regions", unit: "%", cats: ["North", "South", "East", "West"], range: [8, 70] },
  { what: "the average number of hours per week that students in four age groups spent on homework", unit: "hours", cats: ["Age 11–12", "Age 13–14", "Age 15–16", "Age 17–18"], range: [3, 22] },
  { what: "the percentage of adults in four cities who cycled to work at least once a week", unit: "%", cats: ["City A", "City B", "City C", "City D"], range: [4, 45] },
  { what: "the amount of household waste recycled per person in four towns", unit: "kg", cats: ["Town A", "Town B", "Town C", "Town D"], range: [40, 260] },
  { what: "the percentage of university students in four subject areas who were international students", unit: "%", cats: ["Engineering", "Business", "Medicine", "Arts"], range: [5, 48] },
  { what: "the number of visitors (in thousands) to four museums", unit: "thousands", cats: ["Museum A", "Museum B", "Museum C", "Museum D"], range: [60, 900] },
];
const YEARS = [["2005", "2015"], ["2010", "2020"], ["2012", "2022"], ["2000", "2020"]];

export function writingTask1(seed: number): WritingTask {
  const r = rng(seed);
  const t = T1_TOPICS[Math.floor(r() * T1_TOPICS.length)];
  const years = YEARS[Math.floor(r() * YEARS.length)];
  const [lo, hi] = t.range;
  const v = () => Math.round(lo + r() * (hi - lo));
  const categories = t.cats.map((label) => {
    const a = v();
    // Второй год: заметные изменения в обе стороны, чтобы было что сравнивать.
    const b = Math.max(lo, Math.min(hi, Math.round(a + (r() - 0.35) * (hi - lo) * 0.6)));
    return { label, values: [a, b] };
  });
  return {
    title: "Writing Task 1", minutes: 20, minWords: 150,
    prompt: `The chart below shows ${t.what} in ${years[0]} and ${years[1]}.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.`,
    chart: { unit: t.unit, series: years, categories },
  };
}

const T2_PROMPTS = [
  "Some people believe that universities should focus mainly on preparing students for employment. Others think that the purpose of higher education is much broader.\n\nDiscuss both views and give your own opinion.",
  "In many countries, young people are choosing to study abroad rather than at universities in their home country.\n\nDo the advantages of this trend outweigh the disadvantages?",
  "Some people think that schools should teach practical skills such as managing money and cooking, while others believe academic subjects are more important.\n\nDiscuss both views and give your own opinion.",
  "Online learning is becoming more common at all levels of education.\n\nTo what extent do you agree or disagree that online courses can replace traditional classroom teaching?",
  "Many cities are growing rapidly, and traffic congestion is becoming a serious problem.\n\nWhat are the causes of this problem, and what measures could be taken to solve it?",
  "Some people believe that governments should spend money on protecting the environment rather than on space exploration.\n\nTo what extent do you agree or disagree?",
  "In some countries, more and more people are working from home instead of in an office.\n\nIs this a positive or negative development?",
  "Some people say that competition between students is the best way to motivate them, while others think that cooperation is more effective.\n\nDiscuss both views and give your own opinion.",
  "Many young people today spend several hours a day on social media.\n\nWhat problems can this cause, and what can be done to reduce them?",
  "Some people think that it is better to choose a university subject based on personal interest, while others believe that future job opportunities should be the main factor.\n\nDiscuss both views and give your own opinion.",
];
const T2_TAIL = "\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.";

export function writingTask2(k: number): WritingTask {
  return { title: "Writing Task 2", minutes: 40, minWords: 250, prompt: `${T2_PROMPTS[((k % T2_PROMPTS.length) + T2_PROMPTS.length) % T2_PROMPTS.length]}${T2_TAIL}` };
}

/** ID заданий для токена попытки: «w1~<сид>», «w2-<номер>». */
export function pickWritingIds(rand: () => number, seen: Set<string> = new Set()): string[] {
  const fresh = T2_PROMPTS.map((_, i) => `w2-${i}`).filter((id) => !seen.has(id));
  const pool = fresh.length ? fresh : T2_PROMPTS.map((_, i) => `w2-${i}`);
  return [`w1~${(Math.floor(rand() * 2_000_000_000) + 1).toString(36)}`, pool[Math.floor(rand() * pool.length)]];
}

/** Задания попытки по ID из токена (старые попытки без ID — исходные TASK1/TASK2). */
export function writingTasks(ids: string[]): { task1: WritingTask; task2: WritingTask } {
  const w1 = ids.find((x) => x.startsWith("w1~"));
  const w2 = ids.find((x) => x.startsWith("w2-"));
  return {
    task1: w1 ? writingTask1(parseInt(w1.slice(3), 36)) : TASK1,
    task2: w2 ? writingTask2(Number(w2.slice(3))) : TASK2,
  };
}
