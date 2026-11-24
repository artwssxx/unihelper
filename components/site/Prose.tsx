// Простой текст статьи: абзацы через пустую строку, «## » — подзаголовок, строки с «- » — список.
// Никакого HTML из текста: всё выводится как обычный текст, поэтому вставить разметку или скрипт нельзя.

type Block = { type: "h"; text: string } | { type: "p"; text: string } | { type: "ul"; items: string[] };

export function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of body.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.length === 1 && lines[0].startsWith("## ")) {
      blocks.push({ type: "h", text: lines[0].slice(3).trim() });
      continue;
    }
    if (lines.every((l) => l.startsWith("- "))) {
      blocks.push({ type: "ul", items: lines.map((l) => l.slice(2).trim()) });
      continue;
    }
    for (const l of lines) {
      if (l.startsWith("## ")) blocks.push({ type: "h", text: l.slice(3).trim() });
      else blocks.push({ type: "p", text: l });
    }
  }
  return blocks;
}

export function headings(body: string): { id: string; text: string }[] {
  return parseBody(body)
    .filter((b): b is { type: "h"; text: string } => b.type === "h")
    .map((b, i) => ({ id: `s${i + 1}`, text: b.text }));
}

export default function Prose({ body }: { body: string }) {
  let h = 0;
  return (
    <div className="space-y-5 text-[17px] leading-[1.75] text-body">
      {parseBody(body).map((b, i) => {
        if (b.type === "h") {
          h++;
          return (
            <h2 key={i} id={`s${h}`} className="scroll-mt-6 pt-3 text-[24px] font-extrabold leading-tight tracking-tight text-ink">
              {b.text}
            </h2>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={i} className="space-y-2.5">
              {b.items.map((x, j) => (
                <li key={j} className="flex gap-3">
                  <span className="mt-[11px] h-1.5 w-1.5 flex-none rounded-full bg-primary" aria-hidden />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{b.text}</p>;
      })}
    </div>
  );
}
