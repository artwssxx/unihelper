import type { Confidence, FitLabel, FitResult, FundingLabel, Profile, Program } from "../types";
import { profileMajors } from "../profileConst";
import { FIT_RULES, MAJOR_KEYWORDS } from "./config";
import { gradesSummary, SUBJECT_RU, type SubjectKey } from "../grades";
import { profileGpa100 } from "./strength";

export const FIT_LABEL_NAMES: Record<FitLabel, string> = {
  not_eligible: "Не соответствует требованиям",
  ambitious: "Амбициозно",
  realistic: "Реалистично",
  high: "Высокое соответствие",
};

export const FUNDING_LABEL_NAMES: Record<FundingLabel, string> = {
  none: "Финансирования нет",
  low: "Низкое",
  medium: "Среднее",
  high: "Высокое",
  self_funded: "Семья может оплатить",
};

type Position = "below" | "at" | "above" | "unknown";

function compare(value: number | null, typical: number | null, tol: number, above: number): Position {
  if (value == null || typical == null) return "unknown";
  if (value < typical - tol) return "below";
  if (value >= typical + above) return "above";
  return "at";
}

export function totalCost(p: Program): number {
  return p.tuitionUsd + p.livingUsd;
}

export function portfolioRelevant(profile: Profile, program: Program): boolean | null {
  if (program.majors === "any" && !profile.major) return null;
  // Активности считаются профильными, если связаны с любым из выбранных направлений.
  const words = profileMajors(profile).flatMap((m) => MAJOR_KEYWORDS[m] ?? []);
  const text = profile.achievementsText.toLowerCase();
  if (!text.trim()) return false;
  return words.some((w) => text.includes(w));
}

/** Admission Fit — насколько профиль подходит конкретной программе. Никаких процентов. */
export function admissionFit(profile: Profile, program: Program): FitResult["admission"] {
  const reasons: string[] = [];
  const unknown: string[] = [];
  const g100 = profileGpa100(profile);
  const req = program.requirements;

  // 1. Формальные требования — не проходит → дальше не считаем.
  const failed: string[] = [];
  if (req.minIelts != null && (profile.ielts == null || profile.ielts < req.minIelts))
    failed.push(profile.ielts == null ? `нужен IELTS ≥ ${req.minIelts} (ещё не сдан)` : `IELTS ${profile.ielts} < минимума ${req.minIelts}`);
  if (req.minGpa100 != null && g100 != null && g100 < req.minGpa100)
    failed.push(`GPA ниже минимального (≈${req.minGpa100}/100)`);
  if (req.satRequired && profile.sat == null) failed.push("обязателен SAT (ещё не сдан)");
  if (!program.funding.availableToUz && program.isFullGrant) failed.push("грант недоступен гражданам Узбекистана");
  if (failed.length) {
    return { label: "not_eligible", reasons: failed, unknown: [], confidence: "high" };
  }
  reasons.push("формальные требования выполнены");

  // 2. Академическое соответствие — против типичного профиля поступивших.
  const t = program.typical;
  const positions: Position[] = [
    compare(g100, t.gpa100, FIT_RULES.tolerance.gpa100, FIT_RULES.clearlyAbove.gpa100),
    compare(profile.ielts, t.ielts, FIT_RULES.tolerance.ielts, FIT_RULES.clearlyAbove.ielts),
  ];
  if (t.sat != null) positions.push(compare(profile.sat, t.sat, FIT_RULES.tolerance.sat, FIT_RULES.clearlyAbove.sat));
  const known = positions.filter((x) => x !== "unknown");
  let academic: Position = "unknown";
  if (known.length) {
    if (known.includes("below")) academic = "below";
    else if (known.every((x) => x === "above")) academic = "above";
    else academic = "at";
  }
  if (t.gpa100 == null && t.ielts == null && t.sat == null) unknown.push("типичный профиль поступивших (мало данных)");
  else if (academic === "below") reasons.push("профиль ниже типичного для поступивших");
  else if (academic === "above") reasons.push("профиль заметно выше типичного");
  else if (academic === "at") reasons.push("профиль на уровне типичного");
  if (t.sat != null && profile.sat == null) unknown.push("SAT (не сдан — типичные поступившие его подают)");

  // 3. Соответствие портфолио специальности.
  const relevant = portfolioRelevant(profile, program);
  if (relevant === false) reasons.push("активности слабо связаны со специальностью");
  else if (relevant) reasons.push("активности связаны со специальностью");

  // 3б. Оценки по профильным предметам (если ученик их загрузил): направления программы ∩ направления ученика.
  const mine = profileMajors(profile);
  const progMajors = program.majors === "any" ? mine : mine.filter((m) => (program.majors as string[]).includes(m));
  const subj = gradesSummary(profile.grades, progMajors.length ? progMajors : mine);
  const subjName = (k: SubjectKey, raw: string) => (k === "other" ? raw : SUBJECT_RU[k].toLowerCase());
  const weakCore = subj?.weakCore ?? [];
  if (weakCore.length) reasons.push(`слабая оценка по профильному предмету: ${[...new Set(weakCore.map((i) => subjName(i.key, i.subject)))].join(", ")}`);
  else if (subj && subj.core.items.length >= 2 && subj.strongCore.length === subj.core.items.length)
    reasons.push(`сильные оценки по профильным предметам (${[...new Set(subj.core.items.map((i) => subjName(i.key, i.subject)))].join(", ")})`);

  // 4. Качественные компоненты.
  const w = program.weights;
  const qualWeight = w.essay + w.recommendations + w.interview;
  const qualAssessed = profile.essays !== "not_assessed" && profile.recommendations !== "not_assessed";
  const qualStrong = profile.essays === "strong" && profile.recommendations !== "weak";
  if (!qualAssessed) {
    if (w.essay > 0) unknown.push("эссе");
    if (w.recommendations > 0) unknown.push("рекомендации");
  }
  if (w.interview > 0) unknown.push("интервью");
  const qualHeavy = qualWeight >= FIT_RULES.qualitativeHeavy;
  if (qualHeavy) reasons.push("решение сильно зависит от эссе, рекомендаций и интервью");

  // 5. Конкурентность.
  const ar = program.acceptanceRate;
  if (ar == null) unknown.push("acceptance rate");
  else if (ar < FIT_RULES.veryCompetitiveBelow) reasons.push(`очень высокая конкурентность (принимают ~${Math.round(ar * 100)}%)`);
  else if (ar < FIT_RULES.competitiveBelow) reasons.push(`высокая конкурентность (~${Math.round(ar * 100)}%)`);

  // Метка.
  let label: FitLabel;
  const veryCompetitive = ar != null && ar < FIT_RULES.veryCompetitiveBelow;
  const competitive = ar != null && ar < FIT_RULES.competitiveBelow;
  if (academic === "below" || veryCompetitive || (competitive && qualHeavy) || relevant === false && competitive) {
    label = "ambitious";
  } else if (academic === "unknown") {
    // Без данных о типичном профиле не обещаем больше, чем «Амбициозно» для конкурсных программ.
    label = competitive || program.isFullGrant ? "ambitious" : "realistic";
  } else {
    label = "realistic";
  }
  if (
    label === "realistic" &&
    academic === "above" &&
    !competitive &&
    qualAssessed &&
    qualStrong &&
    relevant !== false
  ) {
    label = "high";
  }

  // Жёсткие правила.
  if (label === "high" && program.isFullGrant) {
    label = "realistic";
    reasons.push("полный грант — максимум «Реалистично»");
  }
  if (label === "high" && (!qualAssessed || ar == null || ar < FIT_RULES.noHighBelow)) label = "realistic";
  // Слабый профильный предмет: «Высокое соответствие» невозможно.
  if (label === "high" && weakCore.length) label = "realistic";
  if (label === "realistic" && program.isFullGrant && academic !== "above" && academic !== "at") label = "ambitious";

  return { label, reasons, unknown: [...new Set(unknown)], confidence: confidence(profile, program, academic) };
}

function confidence(profile: Profile, program: Program, academic: Position): Confidence {
  let score = 0;
  if (academic !== "unknown") score++;
  if (program.acceptanceRate != null) score++;
  if (profile.ielts != null || profile.sat != null) score++;
  if (profile.essays !== "not_assessed") score++;
  if (program.verifiedAt) score++;
  return score >= 4 ? "high" : score >= 2 ? "medium" : "low";
}

/** Funding Fit — отдельная оценка финансирования. Поступить и получить деньги — разные задачи. */
export function fundingFit(profile: Profile, program: Program, admission: FitLabel): FitResult["funding"] {
  const reasons: string[] = [];
  const f = program.funding;
  const cost = totalCost(program);
  const affordable = profile.budgetUsd >= cost;

  if (affordable) {
    reasons.push(`полная стоимость ≈ $${cost.toLocaleString("ru-RU")}/год укладывается в бюджет семьи`);
    if (f.type !== "none") reasons.push(`плюс есть ${f.type === "full" ? "полное" : "частичное"} финансирование: ${f.note}`);
    return { label: "self_funded", reasons };
  }
  if (f.type === "none" || !f.availableToUz) {
    reasons.push("программа почти не даёт финансирования иностранцам");
    reasons.push(`стоимость ≈ $${cost.toLocaleString("ru-RU")}/год выше бюджета семьи`);
    return { label: "none", reasons };
  }

  reasons.push(f.note);
  let label: FundingLabel;
  if (admission === "not_eligible") {
    label = "low";
    reasons.push("сначала нужно выполнить формальные требования");
  } else if (f.type === "full") {
    // Полные гранты всегда конкурсные: не выше «Среднее».
    if (f.basis === "need" && f.needBlindIntl === false) {
      label = "low";
      reasons.push("need-aware для иностранцев: просьба о помощи снижает шанс поступления");
    } else {
      label = admission === "ambitious" ? "low" : "medium";
    }
  } else {
    // Частичное: проверяем, закроет ли оно разрыв.
    const gap = cost - profile.budgetUsd;
    if (gap > program.tuitionUsd * 0.6) {
      label = "low";
      reasons.push("даже со скидкой стоимость, скорее всего, выше бюджета");
    } else {
      label = admission === "high" ? "high" : "medium";
    }
  }
  return { label, reasons };
}

export function evaluateProgram(profile: Profile, program: Program): FitResult {
  const admission = admissionFit(profile, program);
  const funding = fundingFit(profile, program, admission.label);
  // Настоящий запасной вариант: профиль проходит и семья может оплатить без гранта.
  const isBackup =
    (admission.label === "realistic" || admission.label === "high") && funding.label === "self_funded";
  return { programId: program.id, admission, funding, isBackup };
}
