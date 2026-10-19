import { describe, expect, it } from "vitest";
import {
  formatPocket,
  mergeIntoPocket,
  pocketTotals,
  removeFromPocketList,
} from "./pocket";

const bolt = { wantId: "a", name: "Lightning Bolt", quantity: 2, estimate: 2 };
const opt = { wantId: "b", name: "Opt", quantity: 3, estimate: null };

describe("mergeIntoPocket", () => {
  it("adds new cards as entries", () => {
    const { pocket, added } = mergeIntoPocket([], [bolt, opt]);
    expect(added).toBe(2);
    expect(pocket).toEqual([
      { name: "Lightning Bolt", quantity: 2, estimate: 2, wantIds: ["a"] },
      { name: "Opt", quantity: 3, estimate: null, wantIds: ["b"] },
    ]);
  });

  it("adds up quantities and estimates of the same card from other wants", () => {
    const first = mergeIntoPocket([], [bolt]).pocket;
    const { pocket } = mergeIntoPocket(first, [
      { wantId: "c", name: "lightning bolt", quantity: 1, estimate: 0.5 },
    ]);
    expect(pocket).toEqual([
      {
        name: "Lightning Bolt",
        quantity: 3,
        estimate: 2.5,
        wantIds: ["a", "c"],
      },
    ]);
  });

  it("skips wants that are already in the pocket", () => {
    const first = mergeIntoPocket([], [bolt]).pocket;
    const result = mergeIntoPocket(first, [bolt]);
    expect(result.added).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.pocket[0]?.quantity).toBe(2);
  });

  it("drops the estimate when one of the merged wants has none", () => {
    const first = mergeIntoPocket([], [bolt]).pocket;
    const { pocket } = mergeIntoPocket(first, [
      { wantId: "d", name: "Lightning Bolt", quantity: 1, estimate: null },
    ]);
    expect(pocket[0]?.estimate).toBeNull();
  });

  it("does not change the input pocket", () => {
    const first = mergeIntoPocket([], [bolt]).pocket;
    mergeIntoPocket(first, [{ ...bolt, wantId: "e" }]);
    expect(first[0]?.quantity).toBe(2);
  });
});

describe("pocket helpers", () => {
  const pocket = mergeIntoPocket([], [bolt, opt]).pocket;

  it("totals cards, estimates and cards without a price", () => {
    expect(pocketTotals(pocket)).toEqual({
      cards: 5,
      estimate: 2,
      unpricedCards: 3,
    });
  });

  it("formats the pocket as a decklist", () => {
    expect(formatPocket(pocket)).toBe("2 Lightning Bolt\n3 Opt");
  });

  it("removes entries by card name", () => {
    expect(removeFromPocketList(pocket, ["OPT"]).map((e) => e.name)).toEqual([
      "Lightning Bolt",
    ]);
  });
});
