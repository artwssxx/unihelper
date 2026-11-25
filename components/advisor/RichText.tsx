import { Fragment, type ReactNode } from "react";

// Простое оформление ответа ИИ без HTML: абзацы, списки («- », «• », «1. »), **жирный**, ссылки https.
// Никакого dangerouslySetInnerHTML — текст ИИ остаётся текстом.

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|(https:\/\/[^\s)\]]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<b key={`${key}-b${i++}`}>{m[1]}</b>);
    else out.push(<a key={`${key}-a${i++}`} href={m[2]} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-primary underline underline-offset-2 [overflow-wrap:anywhere]">{m[2].replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const k = `l${blocks.length}`;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={k} className={`my-1.5 space-y-1 pl-5 ${list.ordered ? "list-decimal" : "list-disc"} marker:text-primary`}>
        {list.items.map((it, i) => <li key={i}>{inline(it, `${k}-${i}`)}</li>)}
      </Tag>,
    );
    list = null;
  };
  text.split("\n").forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-•*]|(\d+)[.)])\s+(.*)$/);
    if (bullet) {
      const ordered = Boolean(bullet[1]);
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push(bullet[2]);
      return;
    }
    flush();
    if (!line.trim()) return;
    const h = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(h ? <p key={`h${i}`} className="mt-2 font-extrabold">{inline(h[1].replace(/\*\*/g, ""), `h${i}`)}</p> : <p key={`p${i}`} className="my-1">{inline(line, `p${i}`)}</p>);
  });
  flush();
  return <Fragment>{blocks}</Fragment>;
}
