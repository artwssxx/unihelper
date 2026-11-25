import { describe, expect, it } from "vitest";
import { diffMatch, snapChanged, snapOf } from "./matchDiff";

const item = (id: string, label: "not_eligible" | "ambitious" | "realistic" | "high") => ({ program: { id, university: id.toUpperCase() }, fit: { admission: { label } } });

describe("что изменилось в подборе", () => {
  it("рост и падение меток, новые вузы считаются отдельно", () => {
    const prev = snapOf([item("a", "ambitious"), item("b", "realistic"), item("c", "realistic")]);
    const d = diffMatch(prev, [item("a", "realistic"), item("b", "ambitious"), item("c", "realistic"), item("d", "high")]);
    expect(d.up.map((x) => [x.id, x.from, x.to])).toEqual([["a", "ambitious", "realistic"]]);
    expect(d.down.map((x) => x.id)).toEqual(["b"]);
    expect(d.added).toBe(1);
  });
  it("без прошлого снимка — ничего не показываем; снимок обновляется только при изменениях", () => {
    expect(diffMatch(undefined, [item("a", "high")])).toEqual({ up: [], down: [], added: 0 });
    const s = snapOf([item("a", "high")]);
    expect(snapChanged(s, snapOf([item("a", "high")]))).toBe(false);
    expect(snapChanged(s, snapOf([item("a", "realistic")]))).toBe(true);
  });
});
