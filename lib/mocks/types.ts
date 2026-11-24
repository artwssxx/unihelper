// Типы движка моков (SAT и IELTS).

export type Exam = "sat" | "ielts";
export type Section = "math" | "rw" | "reading" | "writing";
export type Mode = "light" | "hard";
export type Difficulty = 1 | 2 | 3;
export type AnswerType = "mcq" | "spr" | "text";

export interface Question {
  id: string;
  exam: Exam;
  section: Section;
  domain: string;
  skill: string;
  difficulty: Difficulty;
  stem: string;
  /** Короткий текст к вопросу (SAT RW). */
  passage?: string;
  /** Длинный текст, общий для нескольких вопросов (IELTS Reading). */
  passageId?: string;
  /** Подзаголовок группы вопросов (IELTS: инструкция к блоку). */
  group?: string;
  choices?: string[];
  answerType: AnswerType;
  /** mcq: буква A–D; spr: число; text: слово/фраза. */
  answer: string;
  /** Другие допустимые варианты ответа (text). */
  accept?: string[];
  explanation: string;
  hint?: string;
  source: "code" | "human" | "ai";
  verified: boolean;
}

/** То, что уходит на клиент до завершения модуля: без ответа и разбора. */
export type PublicQuestion = Omit<Question, "answer" | "accept" | "explanation" | "hint" | "verified" | "source">;

export interface Passage {
  id: string;
  title: string;
  text: string;
}

export interface ReviewItem {
  id: string;
  domain: string;
  skill: string;
  difficulty: Difficulty;
  stem: string;
  passage?: string;
  choices?: string[];
  answer: string;
  given: string | null;
  correct: boolean;
  explanation: string;
  timeSec: number;
  module: number;
}

export interface DomainStat {
  domain: string;
  correct: number;
  total: number;
}

export interface MockResult {
  attemptId: string;
  exam: Exam;
  section: Section;
  mode: Mode;
  raw: { correct: number; total: number };
  /** SAT: секция 200–800 диапазоном. */
  scoreLow?: number;
  scoreHigh?: number;
  module2Path?: "easy" | "hard";
  /** IELTS Reading: примерный band. */
  band?: number;
  domains: DomainStat[];
  weakDomains: string[];
  avgTimeSec: number;
  review: ReviewItem[];
  tips: string[];
}
