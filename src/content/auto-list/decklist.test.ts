import { describe, expect, it } from "vitest";
import { formatDecklist, parseDecklist } from "./decklist";

describe("parseDecklist", () => {
  it("reads quantities in the '4 Card' and '4x Card' forms", () => {
    expect(parseDecklist("4 Arbor Elf\n2x Lightning Bolt\n3X Opt")).toEqual([
      { quantity: 4, name: "Arbor Elf" },
      { quantity: 2, name: "Lightning Bolt" },
      { quantity: 3, name: "Opt" },
    ]);
  });

  it("uses a quantity of 1 for lines without a number", () => {
    expect(parseDecklist("Sol Ring")).toEqual([
      { quantity: 1, name: "Sol Ring" },
    ]);
  });

  it("skips blank lines, comments and section headers", () => {
    const text = [
      "// Main",
      "# comment",
      "",
      "Deck",
      "1 Sol Ring",
      "Sideboard",
      "SIDEBOARD:",
      "Commander (1)",
      "Creatures:",
      "1 Opt",
    ].join("\n");
    expect(parseDecklist(text)).toEqual([
      { quantity: 1, name: "Sol Ring" },
      { quantity: 1, name: "Opt" },
    ]);
  });

  it("keeps cards whose names start with a header word when a quantity is given", () => {
    expect(parseDecklist("1 Commander's Sphere")).toEqual([
      { quantity: 1, name: "Commander's Sphere" },
    ]);
  });

  it("removes set codes, collector numbers and finish markers", () => {
    const text = [
      "1 Sol Ring (CMM) 400",
      "1 Arcane Signet (PLST) M3C-283 *F*",
      "1 Command Tower [C21]",
      "1 Fire // Ice (MH2)",
    ].join("\n");
    expect(parseDecklist(text).map((e) => e.name)).toEqual([
      "Sol Ring",
      "Arcane Signet",
      "Command Tower",
      "Fire // Ice",
    ]);
  });

  it("reads 'SB:' sideboard lines", () => {
    expect(parseDecklist("SB: 2 Duress")).toEqual([
      { quantity: 2, name: "Duress" },
    ]);
  });

  it("adds up repeated cards without regard to case", () => {
    expect(parseDecklist("2 Opt\n1 opt\nSB: 1 Opt")).toEqual([
      { quantity: 4, name: "Opt" },
    ]);
  });

  it("drops lines with a quantity of zero", () => {
    expect(parseDecklist("0 Opt")).toEqual([]);
  });
});

describe("formatDecklist", () => {
  it("writes one '<quantity> <name>' line per entry", () => {
    expect(
      formatDecklist([
        { quantity: 2, name: "Opt" },
        { quantity: 1, name: "Sol Ring" },
      ]),
    ).toBe("2 Opt\n1 Sol Ring");
  });
});
