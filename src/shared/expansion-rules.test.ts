import { describe, expect, it } from "vitest";
import { createExpansionMatcher, pickExpansions } from "./expansion-rules";

const noRules = {
  excludedGroups: [],
  includedMembers: [],
  customExclusions: [],
  alwaysInclude: [],
};

describe("createExpansionMatcher", () => {
  it("excludes names that match a group pattern and gives the group as reason", () => {
    const matches = createExpansionMatcher({
      ...noRules,
      excludedGroups: ["promos"],
    });
    expect(matches("Standard Showdown Promos")).toEqual({
      included: false,
      reason: "Promos",
    });
  });

  it("matches without regard to case", () => {
    const matches = createExpansionMatcher({
      ...noRules,
      customExclusions: ["secret lair"],
    });
    expect(matches("Secret Lair Drop Series").included).toBe(false);
  });

  it("lets 'always include' win over exclusions", () => {
    const matches = createExpansionMatcher({
      ...noRules,
      excludedGroups: ["commander"],
      alwaysInclude: ["Commander Masters"],
    });
    expect(matches("Commander Masters")).toEqual({
      included: true,
      allowedBy: "always-include",
      reason: 'Always include "Commander Masters"',
    });
    expect(matches("Commander 2019").included).toBe(false);
  });

  it("does not exclude Fifth Dawn with the white-border group", () => {
    const matches = createExpansionMatcher({
      ...noRules,
      excludedGroups: ["white-border"],
    });
    expect(matches("Fifth Dawn").included).toBe(true);
    expect(matches("Fifth Edition").included).toBe(false);
  });
});

describe("group members", () => {
  const ub = { ...noRules, excludedGroups: ["universes-beyond"] };

  it("skips every franchise of an excluded group by default", () => {
    const matches = createExpansionMatcher(ub);
    expect(matches("FINAL FANTASY Through the Ages")).toEqual({
      included: false,
      reason: "Universes Beyond: FINAL FANTASY",
    });
    expect(matches("Universes Beyond: Doctor Who").included).toBe(false);
  });

  it("allows a franchise that the user includes", () => {
    const matches = createExpansionMatcher({
      ...ub,
      includedMembers: ["ub-lord-of-the-rings", "ub-hobbit"],
    });
    expect(matches("The Lord of the Rings: Tales of Middle-earth")).toEqual({
      included: true,
      allowedBy: "group-member",
      reason: "Allowed: Universes Beyond: The Lord of the Rings",
    });
    expect(matches("The Hobbit: Eternal").included).toBe(true);
    expect(matches("FINAL FANTASY").included).toBe(false);
  });

  it("still applies other groups to an allowed franchise", () => {
    const matches = createExpansionMatcher({
      ...ub,
      excludedGroups: ["universes-beyond", "special-frames"],
      includedMembers: ["ub-hobbit"],
    });
    expect(matches("The Hobbit: Extras")).toEqual({
      included: false,
      reason: "Borderless, showcase and extended art",
    });
  });

  it("ignores allowed members when their group is off", () => {
    const matches = createExpansionMatcher({
      ...noRules,
      includedMembers: ["ub-marvel"],
    });
    expect(matches("Marvel Super Heroes")).toEqual({ included: true });
  });
});

describe("pickExpansions", () => {
  const options = [
    { id: "1", name: "Commander: Foundations" },
    { id: "2", name: "Secret Lair Drop Series: Extra Life" },
    { id: "3", name: "Magic 2010" },
    { id: "4", name: "Standard Showdown Promos" },
    { id: "5", name: "Masters 25" },
  ];

  it("keeps page order and counts only allowed expansions toward the limit", () => {
    const rules = { ...noRules, excludedGroups: ["secret-lair", "promos"] };
    expect(pickExpansions(options, rules, 10).map((o) => o.id)).toEqual([
      "1",
      "3",
      "5",
    ]);
    expect(pickExpansions(options, rules, 2).map((o) => o.id)).toEqual([
      "1",
      "3",
    ]);
  });

  it("returns nothing for a limit of zero", () => {
    expect(pickExpansions(options, noRules, 0)).toEqual([]);
  });
});
