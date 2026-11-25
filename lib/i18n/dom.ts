// Перевод отрисованной страницы на узбекский или английский по словарю (см. translate.ts).
// Работает поверх React: меняет только текст узлов и атрибуты, не трогая структуру DOM,
// поэтому React спокойно обновляет их дальше — новые значения снова переводятся наблюдателем.
// Не переводим: пользовательский текст (translate="no"), поля ввода, код, скрипты и стили.

import { translateText, type Dict } from "./translate";

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "SVG"]);

type Rec = { orig: string; shown: string };

function skipped(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName.toUpperCase())) return true;
    if (e.getAttribute("translate") === "no" || (e as HTMLElement).isContentEditable) return true;
  }
  return false;
}

export interface Translator {
  stop(): void;
  /** Русские строки, для которых не нашлось перевода (для сбора словаря). */
  missing: Set<string>;
}

export function translateDom(dict: Dict, root: HTMLElement = document.documentElement): Translator {
  const texts = new WeakMap<Text, Rec>();
  const attrs = new WeakMap<Element, Map<string, Rec>>();
  const missing = new Set<string>();

  /** Исходный (русский) текст узла: если там наш перевод — берём сохранённый оригинал. */
  const origOf = (n: Text) => {
    const r = texts.get(n);
    return r && n.data === r.shown ? r.orig : n.data;
  };
  const write = (n: Text, orig: string, shown: string) => {
    texts.set(n, { orig, shown });
    if (n.data !== shown) n.data = shown;
  };

  function textNode(n: Text) {
    const parent = n.parentElement;
    if (!parent || skipped(parent)) return;
    // Несколько соседних текстовых узлов (JSX вида «{n} шагов») переводим как одну фразу.
    const kids = parent.childNodes;
    if (kids.length > 1 && [...kids].every((k) => k.nodeType === 3)) {
      const nodes = [...kids] as Text[];
      const origs = nodes.map(origOf);
      const whole = translateText(dict, origs.join(""));
      if (whole != null) {
        nodes.forEach((k, i) => write(k, origs[i], i === 0 ? whole : ""));
        return;
      }
      nodes.forEach((k, i) => single(k, origs[i]));
      return;
    }
    single(n, origOf(n));
  }

  function single(n: Text, orig: string) {
    const tr = translateText(dict, orig);
    if (tr != null) write(n, orig, tr);
    else {
      if (texts.has(n)) write(n, orig, orig);
      if (/[А-Яа-яЁё]/.test(orig) && orig.trim()) missing.add(orig.replace(/\s+/g, " ").trim());
    }
  }

  function element(el: Element) {
    if (skipped(el)) return;
    let m = attrs.get(el);
    for (const a of ATTRS) {
      const cur = el.getAttribute(a);
      if (cur == null) continue;
      const r = m?.get(a);
      const orig = r && cur === r.shown ? r.orig : cur;
      const tr = translateText(dict, orig);
      if (tr == null) continue;
      if (!m) attrs.set(el, (m = new Map()));
      m.set(a, { orig, shown: tr });
      if (cur !== tr) el.setAttribute(a, tr);
    }
  }

  function subtree(node: Node) {
    if (node.nodeType === 3) return textNode(node as Text);
    if (node.nodeType !== 1) return;
    const el = node as Element;
    if (skipped(el)) return;
    element(el);
    el.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(",")).forEach(element);
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (w.nextNode()) nodes.push(w.currentNode as Text);
    nodes.forEach(textNode);
  }

  subtree(root);
  const mo = new MutationObserver((list) => {
    for (const r of list) {
      if (r.type === "characterData") textNode(r.target as Text);
      else if (r.type === "attributes") element(r.target as Element);
      else r.addedNodes.forEach(subtree);
    }
  });
  mo.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });

  return {
    missing,
    stop() {
      mo.disconnect();
      // Возвращаем русский текст всему, что сейчас на странице.
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) {
        const n = w.currentNode as Text;
        const r = texts.get(n);
        if (r && n.data === r.shown) n.data = r.orig;
      }
      root.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(",")).forEach((el) => {
        attrs.get(el)?.forEach((r, a) => el.getAttribute(a) === r.shown && el.setAttribute(a, r.orig));
      });
    },
  };
}
