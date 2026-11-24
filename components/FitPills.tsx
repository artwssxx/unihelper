import { FIT_LABEL_NAMES, FUNDING_LABEL_NAMES } from "@/lib/scoring/fit";
import type { FitResult } from "@/lib/types";

/** Две метки рядом: «Поступление: …», «Финансирование: …» + «Запасной вариант». */
export default function FitPills({ fit }: { fit: FitResult }) {
  const adm = FIT_LABEL_NAMES[fit.admission.label].toLowerCase();
  const fund = FUNDING_LABEL_NAMES[fit.funding.label].toLowerCase();
  return (
    <div className="flex flex-wrap gap-2">
      <span className={`pill ${fit.admission.label === "not_eligible" ? "bg-red-soft text-red" : "bg-primary-soft text-primary-ink"}`}>
        Поступление: {adm}
      </span>
      <span className="pill bg-orange-soft text-orange-ink-2">Финансирование: {fund}</span>
      {fit.isBackup && <span className="pill bg-inv text-white">Запасной вариант</span>}
    </div>
  );
}
