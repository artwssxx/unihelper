import { describe, expect, it } from "vitest";
import { appUrl, digestText, escapeHtml, makeLinkCode, mainKeyboard, parseCommand, readLinkCode, safePath } from "./bot";

const UID = "65c0e2ae-b1b2-4d37-8f89-6731597e7e6c";

describe("telegram-бот", () => {
  it("разбирает команды с упоминанием бота и аргументом", () => {
    expect(parseCommand("/start")).toEqual({ cmd: "start", arg: "" });
    expect(parseCommand("/start@unihelperapp_bot labc")).toEqual({ cmd: "start", arg: "labc" });
    expect(parseCommand("/Plan")).toEqual({ cmd: "plan", arg: "" });
    expect(parseCommand("привет")).toBeNull();
  });

  it("код привязки: укладывается в лимит /start, проверяется подписью и сроком", () => {
    const code = makeLinkCode(UID, "secret", 1_000_000_000_000);
    expect(code.length).toBeLessThanOrEqual(64);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(readLinkCode(code, "secret", 1_000_000_000_000)).toBe(UID);
    expect(readLinkCode(code, "other-secret", 1_000_000_000_000)).toBeNull();
    expect(readLinkCode(code, "secret", 1_000_000_000_000 + 3601_000)).toBeNull();
    const forged = code.slice(0, 5) + (code[5] === "a" ? "b" : "a") + code.slice(6);
    expect(readLinkCode(forged, "secret", 1_000_000_000_000)).toBeNull();
  });

  it("мини-приложение открывает только внутренние адреса", () => {
    expect(safePath("/community/chats?c=1")).toBe("/community/chats?c=1");
    expect(safePath("https://evil.example")).toBe("/dashboard");
    expect(safePath("//evil.example")).toBe("/dashboard");
    expect(appUrl("https://x.app", "/mocks")).toBe("https://x.app/tg?to=%2Fmocks");
  });

  it("клавиатура: кнопки мини-приложения ведут на сайт", () => {
    const kb = mainKeyboard("https://x.app");
    const urls = kb.inline_keyboard.flat().map((b) => b.web_app?.url ?? b.url);
    expect(urls.every((u) => u?.startsWith("https://x.app/"))).toBe(true);
  });

  it("дайджест экранирует HTML и пустой не отправляется", () => {
    expect(digestText("A", [], [])).toBeNull();
    const t = digestText("<b>", [{ title: "Сдать <IELTS>", month: "дек 2026", overdue: true }], []);
    expect(t).toContain("&lt;IELTS&gt;");
    expect(t).toContain("Просрочено: 1");
    expect(escapeHtml("a&b")).toBe("a&amp;b");
  });
});
