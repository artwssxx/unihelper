"use client";

import ContentManager from "@/components/admin/ContentManager";

export default function AdminPrograms() {
  return (
    <ContentManager
      kind="programs"
      title="Программы и гранты"
      subtitle="Требования, стоимость, финансирование и веса для экспертной системы. Метки Admission Fit / Funding Fit пересчитываются у учеников сразу после сохранения."
      columns={[
        { label: "Вуз / программа", render: (d) => <><div className="font-bold">{String(d.university)}</div><div className="text-xs text-muted">{String(d.name)}</div></> },
        { label: "Страна", render: (d) => `${d.country}${d.isLocal ? " · UZ-вуз" : ""}` },
        { label: "Стоимость", render: (d) => `$${Number(d.tuitionUsd) + Number(d.livingUsd)}` },
        { label: "Проверено", render: (d) => (d.verifiedAt ? <span className="text-green">{String(d.verifiedAt).slice(0, 10)}</span> : <span className="text-orange-ink">нет</span>) },
      ]}
      template={() => ({
        id: "new-program", name: "Бакалавриат", university: "", country: "UZ", city: "Ташкент", isLocal: true, isPartner: false,
        majors: "any", url: null, qsRank: null, acceptanceRate: null,
        typical: { gpa100: null, ielts: null, sat: null },
        requirements: { minIelts: null, minGpa100: null, satRequired: false },
        tuitionUsd: 3000, livingUsd: 2500,
        funding: { type: "partial", basis: "merit", needBlindIntl: null, availableToUz: true, note: "" },
        weights: { essay: 0.1, recommendations: 0, interview: 0.2 },
        isFullGrant: false, deadlineNote: "", verifiedAt: null,
      })}
    />
  );
}
