// Проверка эссе по правилам — работает без ИИ. ИИ-проверка (lib/server/ai.ts) дополняет её.

const CLICHES = [
  "с детства мечтал", "с детства мечтала", "с самого детства", "изменить мир", "моя страсть", "я всегда хотел", "я всегда хотела",
  "since i was a child", "ever since i was young", "change the world", "my passion", "i have always wanted", "dream come true",
  "in today's world", "nowadays", "make a difference", "think outside the box", "hard work pays off", "the world is a global village",
];

export interface EssayFeedback {
  scores: { structure: number; voice: number; specificity: number; language: number };
  cliches: { phrase: string; quote: string }[];
  questions: string[];
  summary: string;
  source: "ai" | "rules";
}

export function ruleCheck(text: string): EssayFeedback {
  const lower = text.toLowerCase();
  const words = (text.match(/\S+/g) ?? []).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const sentences = text.split(/[.!?]+\s/).filter((s) => s.trim());
  const avgLen = sentences.length ? words / sentences.length : 0;
  const numbers = (text.match(/\d+/g) ?? []).length;
  const iCount = (lower.match(/\b(я|i)\b/g) ?? []).length;
  const cliches = CLICHES.filter((c) => lower.includes(c)).map((c) => {
    const i = lower.indexOf(c);
    return { phrase: c, quote: text.slice(Math.max(0, i - 30), i + c.length + 30).trim() };
  });
  const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
  const scores = {
    structure: clamp(3 + Math.min(paragraphs, 5) + (words >= 250 ? 2 : 0)),
    voice: clamp(4 + Math.min(iCount / 5, 4) - cliches.length),
    specificity: clamp(3 + Math.min(numbers, 4) + (words > 300 ? 1 : 0) - cliches.length / 2),
    language: clamp(9 - (avgLen > 28 ? 3 : avgLen > 22 ? 1 : 0) - (avgLen < 8 ? 2 : 0)),
  };
  return {
    scores,
    cliches,
    questions: [
      "Какой один конкретный момент из вашей истории лучше всего показывает, кто вы?",
      "Что вы сделали сами — и что изменилось после этого для вас или других?",
      "Как этот опыт связан с тем, что вы хотите изучать в этой программе?",
    ],
    summary: `${words} слов, ${paragraphs} абз., в среднем ${Math.round(avgLen)} слов в предложении. Это автоматическая проверка по правилам; ИИ-разбор точнее.`,
    source: "rules",
  };
}
