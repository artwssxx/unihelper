"use client";

import ContentManager from "@/components/admin/ContentManager";

export default function AdminEvents() {
  return (
    <ContentManager
      kind="events"
      title="Ивенты"
      subtitle="Олимпиады, волонтёрство, хакатоны, летние школы. «Реклама» помечает продвигаемые ивенты для учеников."
      columns={[
        { label: "Ивент", render: (d) => <><div className="font-bold">{String(d.title)}</div><div className="text-xs text-muted">{String(d.organizer)}</div></> },
        { label: "Когда", render: (d) => new Date(String(d.startsAt)).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) },
        { label: "Регистрация", render: (d) => (d.registrationMode === "unihelper" ? `Unihelper · ${d.registered}/${d.capacity}` : "у организатора") },
      ]}
      template={() => ({
        id: "new-event", title: "", type: "olympiad", organizer: "", location: "Ташкент", online: false,
        startsAt: new Date(Date.now() + 14 * 86400000).toISOString(), tags: ["any"], registrationMode: "unihelper",
        capacity: 50, registered: 0, questions: [], isPromoted: false, description: "",
      })}
    />
  );
}
