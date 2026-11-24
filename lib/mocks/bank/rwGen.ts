import type { Difficulty, Question } from "../types";
import { rng } from "./satMath";

// Генераторы SAT Reading & Writing: свои предложения + правила. ID «rwg-<вид>-<номер>~<сид>»:
// номер выбирает содержание, сид — формулировку вариантов и их порядок. Правильный ответ строит код.

type R = () => number;
const pick = <T,>(r: R, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const LETTERS = ["A", "B", "C", "D"] as const;
const SEC = "Standard English Conventions";
const EI = "Expression of Ideas";

function shuffled<T>(xs: T[], r: R): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mcq(id: string, o: { domain: string; skill: string; difficulty: Difficulty; passage: string; stem: string; correct: string; wrong: string[]; explanation: string; hint: string }, r: R): Question | null {
  const opts = [o.correct, ...o.wrong.slice(0, 3)];
  if (new Set(opts.map((x) => x.toLowerCase())).size !== 4) return null;
  const order = shuffled([0, 1, 2, 3], r);
  return {
    id, exam: "sat", section: "rw", domain: o.domain, skill: o.skill, difficulty: o.difficulty,
    passage: o.passage, stem: o.stem, choices: order.map((i) => opts[i]), answerType: "mcq",
    answer: LETTERS[order.indexOf(0)], explanation: o.explanation, hint: o.hint, source: "code", verified: true,
  };
}

// ───────── Переходы ─────────
type Rel = "contrast" | "result" | "addition" | "example" | "sequence";
const TR: Record<Rel, { words: string[]; ru: string }> = {
  contrast: { words: ["However", "In contrast", "On the other hand", "Nevertheless"], ru: "противопоставление" },
  result: { words: ["Therefore", "As a result", "Consequently", "Thus"], ru: "следствие" },
  addition: { words: ["Moreover", "In addition", "Furthermore", "Additionally"], ru: "добавление" },
  example: { words: ["For example", "For instance"], ru: "пример" },
  sequence: { words: ["Then", "Next", "Afterward", "Subsequently"], ru: "последовательность" },
};
const PAIRS: [string, string, Rel, Difficulty][] = [
  ["Most desert plants store water in thick leaves or stems.", "the saxaul tree survives by sending its roots deep underground instead.", "contrast", 2],
  ["The city added forty new electric buses to its routes last year.", "air pollution near the busiest roads fell noticeably.", "result", 1],
  ["Volunteering can help students discover what they enjoy.", "it gives them experiences they can describe in admission essays.", "addition", 1],
  ["Many traditional crafts in Uzbekistan are passed down within families.", "the ceramic workshops of Rishtan have been run by the same families for generations.", "example", 1],
  ["The researchers first collected soil samples from twenty farms.", "they measured how much salt each sample contained.", "sequence", 1],
  ["The first version of the app was slow and hard to navigate.", "the second version, rebuilt by the same students, loaded in under a second.", "contrast", 1],
  ["Bees pollinate a large share of the crops that people eat.", "a decline in bee populations could affect food prices.", "result", 2],
  ["The library extended its opening hours during exam season.", "it added extra seats in the reading hall.", "addition", 1],
  ["Some materials conduct heat very well.", "copper is often used in cooking pans because it spreads heat evenly.", "example", 2],
  ["The students wrote a draft of their research report.", "they asked two teachers to review it before submitting it.", "sequence", 1],
  ["Early telescopes could magnify objects only a few times.", "modern space telescopes can detect galaxies billions of light-years away.", "contrast", 2],
  ["The river's water level dropped sharply during the dry summer.", "several fishing boats could not leave the harbor.", "result", 1],
  ["Learning a second language can improve memory.", "it can make it easier to understand other cultures.", "addition", 2],
  ["Some animals change their behavior with the seasons.", "certain birds fly thousands of kilometers south before winter begins.", "example", 1],
  ["The chef soaked the rice for an hour.", "she added it to the pot with carrots, onions, and meat to make plov.", "sequence", 1],
  ["Critics praised the film's photography.", "many viewers found its plot difficult to follow.", "contrast", 1],
  ["The company switched its factories to solar power.", "its electricity costs fell by almost a third.", "result", 2],
  ["Regular exercise strengthens the heart.", "it has been linked to better sleep and lower stress.", "addition", 2],
  ["Several ancient cities were built along trade routes.", "Bukhara grew wealthy as caravans stopped there on the Silk Road.", "example", 2],
  ["The team built a small prototype of the water filter.", "they tested it with river water from three different villages.", "sequence", 2],
];

function genTransition(k: number, seed: number): Question | null {
  const p = PAIRS[k];
  if (!p) return null;
  const r = rng(seed);
  const [s1, s2, rel, d] = p;
  const correct = pick(r, TR[rel].words);
  const others = shuffled((Object.keys(TR) as Rel[]).filter((x) => x !== rel), r).slice(0, 3);
  return mcq(`rwg-tr-${k}~${seed.toString(36)}`, {
    domain: EI, skill: "Transitions", difficulty: d,
    passage: `${s1} ______, ${s2}`,
    stem: "Which choice completes the text with the most logical transition?",
    correct, wrong: others.map((o) => pick(r, TR[o].words)),
    explanation: `Связь между предложениями — ${TR[rel].ru}: подходит «${correct}». Остальные варианты задают другую логику.`,
    hint: "Сначала определите связь между предложениями (контраст, следствие, пример…), потом смотрите варианты.",
  }, r);
}

// ───────── Границы предложений ─────────
const CLAUSES: [string, string, Difficulty][] = [
  ["The museum in Nukus holds one of the largest collections of Russian avant-garde art in the", "world it was founded by the artist Igor Savitsky in 1966."],
  ["The science olympiad lasted three", "days each team presented its project to a panel of judges."],
  ["Maria practiced the piano every", "evening her teacher noticed a clear improvement within a month."],
  ["The bridge was closed for repairs in", "March drivers had to use a longer road through the mountains."],
  ["Our school's robotics club meets on", "Saturdays new members are always welcome to join."],
  ["The recipe calls for fresh", "herbs dried ones can be used if fresh herbs are not available."],
  ["The village switched to drip irrigation five years", "ago its farms now use far less water than before."],
  ["The novel was first published in", "1930 it has since been translated into more than forty languages."],
].map(([a, b], i) => [a, b, (i % 3 === 2 ? 3 : 2) as Difficulty]);

function genBoundary(k: number, seed: number): Question | null {
  const c = CLAUSES[k];
  if (!c) return null;
  const r = rng(seed);
  const [a, b, d] = c;
  const lastA = a.split(" ").pop()!;
  const headA = a.slice(0, a.length - lastA.length).trimEnd();
  const firstB = b.split(" ")[0];
  const restB = b.slice(firstB.length).trimStart();
  const style = r() < 0.5 ? "semi" : "and";
  const correct = style === "semi" ? `${lastA} ${firstB};` : `${lastA} ${firstB}, and`;
  // Граница между независимыми предложениями — после firstB; варианты различаются пунктуацией.
  const wrong = style === "semi" ? [`${lastA} ${firstB},`, `${lastA} ${firstB}`, `${lastA}, ${firstB}`] : [`${lastA} ${firstB} and`, `${lastA} ${firstB},`, `${lastA} ${firstB}`];
  return mcq(`rwg-bd-${k}~${seed.toString(36)}`, {
    domain: SEC, skill: "Boundaries", difficulty: d,
    passage: `${headA} ______ ${restB}`,
    stem: "Which choice conforms to the conventions of Standard English?",
    correct, wrong,
    explanation: style === "semi"
      ? "Здесь соединяются две независимые части предложения. Без союза их разделяет точка с запятой; одна запятая даёт comma splice, а без знака получится run-on."
      : "Две независимые части предложения соединяются запятой и союзом «and». Без запятой перед «and» или без союза предложение построено неверно.",
    hint: "Найдите, где заканчивается одна законченная мысль и начинается другая.",
  }, r);
}

// ───────── Согласование подлежащего и сказуемого ─────────
type Agr = [subject: string, between: string, singular: boolean, verb: [sg: string, pl: string, ing: string, inf: string], rest: string];
const AGR: Agr[] = [
  ["The collection of rare manuscripts", "in the city archive", false, ["attracts", "attract", "attracting", "to attract"], "researchers from many countries."],
  ["The list of finalists", "for both national olympiads", true, ["was", "were", "being", "to be"], "announced on Monday."],
  ["Each of the new laboratories", "on the third floor", true, ["has", "have", "having", "to have"], "its own ventilation system."],
  ["The students in the advanced chemistry class", "taught by Ms. Rahimova", false, ["has", "have", "having", "to have"], "already finished their projects."],
  ["A group of volunteers", "from three local schools", true, ["cleans", "clean", "cleaning", "to clean"], "the riverbank every spring."],
  ["The results of the survey", "about students' sleep habits", false, ["suggests", "suggest", "suggesting", "to suggest"], "that most teenagers sleep less than eight hours."],
  ["The number of applicants", "to engineering programs", true, ["has", "have", "having", "to have"], "risen every year since 2020."],
  ["The paintings", "displayed in the hall of the old madrasa", false, ["dates", "date", "dating", "to date"], "back to the nineteenth century."],
  ["Neither the coach nor the players", "on the visiting team", false, ["was", "were", "being", "to be"], "ready for the sudden rain."],
  ["The bridge", "between the two halves of the old town", true, ["is", "are", "being", "to be"], "more than three hundred years old."],
];

function genAgreement(k: number, seed: number): Question | null {
  const a = AGR[k];
  if (!a) return null;
  const r = rng(seed);
  const [subject, between, singular, [sg, pl, ing, inf], rest] = a;
  const correct = singular ? sg : pl;
  return mcq(`rwg-ag-${k}~${seed.toString(36)}`, {
    domain: SEC, skill: "Form, Structure, and Sense", difficulty: k % 3 === 0 ? 3 : 2,
    passage: `${subject} ${between} ______ ${rest}`,
    stem: "Which choice conforms to the conventions of Standard English?",
    correct, wrong: [singular ? pl : sg, ing, inf],
    explanation: `Подлежащее — «${subject}» (${singular ? "единственное" : "множественное"} число); слова «${between}» его не меняют. Нужен глагол в личной форме: «${correct}».`,
    hint: "Найдите подлежащее и не обращайте внимания на слова между ним и глаголом.",
  }, r);
}

// ───────── its / it's / their / they're ─────────
const POSS: [string, "its" | "it's" | "their" | "they're"][] = [
  ["The company announced that ______ new headquarters will open in Tashkent next year.", "its"],
  ["The volunteers said that ______ planning to plant two hundred trees this spring.", "they're"],
  ["Because the old bridge was damaged, ______ being replaced with a wider one.", "it's"],
  ["The two schools combined ______ libraries to give students access to more books.", "their"],
  ["The museum changed ______ opening hours to stay open later on Fridays.", "its"],
  ["After months of training, the debaters feel that ______ ready for the national final.", "they're"],
  ["The scientists published ______ findings in an international journal.", "their"],
  ["The committee says ______ too early to know how many students will apply.", "it's"],
];
const POSS_RU: Record<string, string> = {
  its: "«its» — притяжательное «его/её» для предмета или организации (без апострофа).",
  "it's": "«it's» = «it is»: здесь нужно «это есть/является».",
  their: "«their» — притяжательное «их».",
  "they're": "«they're» = «they are»: здесь нужно «они есть/являются».",
};

function genPossessive(k: number, seed: number): Question | null {
  const p = POSS[k];
  if (!p) return null;
  const r = rng(seed);
  const [passage, correct] = p;
  const all = ["its", "it's", "their", "they're"];
  return mcq(`rwg-ps-${k}~${seed.toString(36)}`, {
    domain: SEC, skill: "Form, Structure, and Sense", difficulty: 1,
    passage, stem: "Which choice conforms to the conventions of Standard English?",
    correct, wrong: all.filter((x) => x !== correct),
    explanation: POSS_RU[correct],
    hint: "Попробуйте подставить «it is» / «they are»: если смысл сохраняется — нужен апостроф.",
  }, r);
}

const GENS: Record<string, { make: (k: number, seed: number) => Question | null; count: number }> = {
  tr: { make: genTransition, count: PAIRS.length },
  bd: { make: genBoundary, count: CLAUSES.length },
  ag: { make: genAgreement, count: AGR.length },
  ps: { make: genPossessive, count: POSS.length },
};

/** Вопрос по ID «rwg-<вид>-<номер>~<сид>». */
export function makeRw(id: string): Question | null {
  const m = id.match(/^rwg-([a-z]{2})-(\d+)~([0-9a-z]{1,8})$/);
  if (!m || !GENS[m[1]]) return null;
  return GENS[m[1]].make(Number(m[2]), parseInt(m[3], 36));
}

/** Все сочетания «вид-номер» — из них собирается пул попытки. */
export function rwGeneratorBases(): string[] {
  return Object.entries(GENS).flatMap(([g, v]) => Array.from({ length: v.count }, (_, i) => `rwg-${g}-${i}`));
}
