import { createHash, createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const BOT = "123456:TEST_TOKEN";

describe("вход через Telegram", async () => {
  const { verifyLoginWidget, verifyWebAppInitData } = await import("./server/telegramAuth");
  const now = Math.floor(Date.now() / 1000);

  it("Login Widget: верная подпись принимается, подделка — нет", () => {
    const data: Record<string, string | number> = { id: 42, first_name: "Aziz", username: "aziz", auth_date: now };
    const check = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join("\n");
    const hash = createHmac("sha256", createHash("sha256").update(BOT).digest()).update(check).digest("hex");
    expect(verifyLoginWidget({ ...data, hash }, BOT)?.id).toBe(42);
    expect(verifyLoginWidget({ ...data, id: 43, hash }, BOT)).toBeNull();
    expect(verifyLoginWidget({ ...data, hash }, "999:OTHER")).toBeNull();
  });

  it("Login Widget: устаревшие данные отклоняются", () => {
    const data: Record<string, string | number> = { id: 42, auth_date: now - 3 * 86400 };
    const check = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join("\n");
    const hash = createHmac("sha256", createHash("sha256").update(BOT).digest()).update(check).digest("hex");
    expect(verifyLoginWidget({ ...data, hash }, BOT)).toBeNull();
  });

  it("Mini App initData: проверка подписи", () => {
    const p = new URLSearchParams({ auth_date: String(now), query_id: "AAA", user: JSON.stringify({ id: 7, first_name: "Malika" }) });
    const check = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
    const secret = createHmac("sha256", "WebAppData").update(BOT).digest();
    p.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
    expect(verifyWebAppInitData(p.toString(), BOT)?.id).toBe(7);
    p.set("user", JSON.stringify({ id: 8, first_name: "Malika" }));
    expect(verifyWebAppInitData(p.toString(), BOT)).toBeNull();
  });
});

describe("тариф в подписанной cookie", async () => {
  const { signPlan, readPlanCookie } = await import("./server/plan");
  it("подпись проверяется, подделка и истёкший срок — нет", () => {
    const exp = Date.now() + 1000_000;
    expect(readPlanCookie(signPlan("pro", exp))?.plan).toBe("pro");
    expect(readPlanCookie(signPlan("pro", exp).replace("pro.", "pro.9"))).toBeNull();
    expect(readPlanCookie(`pro.${exp}.forged`)).toBeNull();
    expect(readPlanCookie(signPlan("pro", Date.now() - 1))).toBeNull();
  });
});

describe("слияние данных браузера и аккаунта", async () => {
  const { mergeStates } = await import("./stateMerge");
  it("истории объединяются, профиль из аккаунта, демо не переносится", () => {
    const m = mergeStates(
      { mocks: [{ attemptId: "a", exam: "sat", section: "math", mode: "light", status: "completed", finishedAt: "2026-01-01" }], myPrograms: ["x"] },
      { mocks: [{ attemptId: "b", exam: "sat", section: "rw", mode: "hard", status: "completed", finishedAt: "2026-02-01" }], myPrograms: ["y"], profile: { city: "Ташкент" } as never },
    );
    expect(m.mocks?.map((x) => x.attemptId).sort()).toEqual(["a", "b"]);
    expect(m.myPrograms?.sort()).toEqual(["x", "y"]);
    expect(m.profile?.city).toBe("Ташкент");
    const d = mergeStates({ demo: { active: true, step: 0, tour: true }, myPrograms: ["demo"] }, {});
    expect(d.myPrograms).toEqual([]);
    expect(d.demo).toBeUndefined();
  });
});
