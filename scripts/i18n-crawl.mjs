// Сбор строк, которых нет в словаре, с живых страниц (тексты с подстановками, контент из базы).
// Запуск при работающем сайте: node scripts/i18n-crawl.mjs [http://localhost:3100]
// Обходит публичные страницы, анкету и кабинет в демо-режиме на узбекском и дописывает
// найденное в scripts/i18n-extra.json; затем npm run i18n:translate переведёт новые строки.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const H = process.argv[2] || "http://localhost:3100";
const OUT = new URL("./i18n-extra.json", import.meta.url).pathname;
const found = new Set(existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : []);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem("uh-lang", "uz"));
const pg = await ctx.newPage();

async function grab(label) {
  await pg.waitForTimeout(1200);
  const list = await pg.evaluate(() => [...(window.__i18nMissing ?? [])]);
  const before = found.size;
  list.forEach((s) => found.add(s));
  console.log(`${label}: +${found.size - before}`);
}
async function visit(path, label = path) {
  await pg.goto(H + path, { waitUntil: "domcontentloaded" }).catch(() => {});
  await grab(label);
}
async function clickAll(selector, label) {
  const n = await pg.locator(selector).count();
  for (let i = 0; i < Math.min(n, 8); i++) {
    await pg.locator(selector).nth(i).click({ timeout: 2000 }).catch(() => {});
    await grab(`${label} #${i}`);
  }
}

// Гость
for (const p of ["/", "/login", "/pricing", "/blog", "/courses", "/demo", "/dashboard", "/mocks/run?exam=sat&section=math&mode=light"]) await visit(p);
await pg.goto(H + "/blog");
const post = await pg.locator("a[href^='/blog/']").first().getAttribute("href").catch(() => null);
if (post) await visit(post, "blog post");
await pg.goto(H + "/courses");
const course = await pg.locator("a[href^='/courses/']").first().getAttribute("href").catch(() => null);
if (course) await visit(course, "course");

// Анкета: все шаги
await visit("/quiz", "quiz 0");
for (let i = 1; i < 10; i++) {
  await pg.locator("input[placeholder]").first().fill("4").catch(() => {});
  await pg.locator("main .chip").first().click().catch(() => {});
  await pg.locator("button.btn-primary.flex-1").click({ timeout: 2000 }).catch(() => {});
  await grab(`quiz ${i}`);
}

// Кабинет в демо
await pg.goto(H + "/demo");
await pg.waitForTimeout(1000);
await pg.locator("button.btn-primary, a.btn-primary").first().click().catch(() => {});
await pg.waitForURL("**/dashboard", { timeout: 15000 }).catch(() => {});
for (const p of ["/dashboard", "/programs", "/roadmap", "/mocks", "/mocks/report", "/events", "/lessons", "/community", "/assistant", "/essays", "/portfolio", "/coins", "/profile", "/pricing"]) {
  await visit(p);
  await clickAll("[role=tab]", `${p} tabs`);
}
await visit("/programs");
await clickAll("article button.btn-secondary", "program detail");
await visit("/events");
await clickAll("article button", "event");
await visit("/lessons");
const lesson = await pg.locator("a[href^='/lessons/']").first().getAttribute("href").catch(() => null);
if (lesson) await visit(lesson, "lesson");
for (const q of ["exam=sat&section=math", "exam=sat&section=rw", "exam=ielts&section=reading", "exam=ielts&section=writing"]) {
  await visit(`/mocks/run?${q}&mode=light`, q);
  await pg.locator("button.btn-primary").first().click().catch(() => {});
  await grab(`${q} started`);
}

writeFileSync(OUT, JSON.stringify([...found].sort((a, c) => a.localeCompare(c, "ru")), null, 1) + "\n");
console.log(`всего без перевода: ${found.size} → ${OUT}`);
await b.close();
