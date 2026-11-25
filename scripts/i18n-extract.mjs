// Сбор русских строк интерфейса из исходников (JSX-текст, строки, шаблоны) для словарей перевода.
// node scripts/i18n-extract.mjs [--json] — печатает статистику или JSON со строками.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const ROOT = new URL("..", import.meta.url).pathname;
// Админка, тесты, серверные промпты ИИ, бот (пишет в Telegram) и лендинг (свои словари) — не в словарь сайта.
const SKIP = [/\/\(admin\)\//, /components\/admin\//, /\.test\.tsx?$/, /lib\/server\//, /app\/api\/admin\//, /\/node_modules\//, /lib\/telegram\//, /lib\/i18n\/(landing|translate|dom|lang)\.ts$/, /components\/landing\//];
const CYR = /[А-Яа-яЁё]/;

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs)$/.test(f) && !SKIP.some((r) => r.test(p))) out.push(p);
  }
  return out;
}

export function extract(dirs = ["app", "components", "lib", "config", "data"]) {
  const found = new Map(); // текст → файлы
  const add = (raw, file) => {
    const t = raw.replace(/\s+/g, " ").trim();
    if (!t || !CYR.test(t)) return;
    if (!found.has(t)) found.set(t, new Set());
    found.get(t).add(file.replace(ROOT, ""));
  };
  for (const dir of dirs) {
    for (const file of walk(join(ROOT, dir))) {
      const src = readFileSync(file, "utf8");
      const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const visit = (n) => {
        if (ts.isJsxText(n)) add(n.text, file);
        else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
          if (!ts.isImportDeclaration(n.parent) && !ts.isExternalModuleReference(n.parent)) add(n.text, file);
        } else if (ts.isTemplateExpression(n)) {
          // «Шаг ${n} из ${m}» → «Шаг # из #»
          add([n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join("#"), file);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
  }
  return found;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const f = extract();
  if (process.argv.includes("--json")) console.log(JSON.stringify([...f.keys()], null, 1));
  else {
    const all = [...f.keys()];
    const chars = all.reduce((s, x) => s + x.length, 0);
    const byDir = {};
    for (const [t, files] of f) for (const file of files) { const d = file.split("/").slice(0, 2).join("/"); byDir[d] = (byDir[d] ?? 0) + t.length; }
    console.log("strings:", all.length, "chars:", chars);
    console.log(Object.entries(byDir).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([d, c]) => `${d}: ${c}`).join("\n"));
  }
}
