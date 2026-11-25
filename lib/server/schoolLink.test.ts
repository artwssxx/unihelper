import { describe, expect, it } from "vitest";
import { openSession, sealSession } from "./schoolLink";

describe("сессия для автообновления дневника", () => {
  it("шифруется и расшифровывается; подделанный или чужой шифротекст не открывается", () => {
    const s = { kind: "emaktab" as const, jar: { UZDnevnikAuth_a: "abc", UZDnevnikAuth_l: "def" } };
    const sealed = sealSession(s);
    expect(sealed).not.toContain("abc");
    expect(openSession(sealed)).toEqual(s);
    const broken = sealed.slice(0, -3) + (sealed.endsWith("A") ? "BBB" : "AAA");
    expect(openSession(broken)).toBeNull();
    expect(openSession("garbage")).toBeNull();
  });
});
