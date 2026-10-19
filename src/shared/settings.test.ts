import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXCLUDED_GROUPS,
  migrateLegacyExclusions,
} from "./expansion-groups";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";

/** The default exclusion list of version 2.0. */
const LEGACY_DEFAULTS = [
  "Universes Beyond",
  "Extras",
  "Retro",
  "Secret Lair",
  "Promo",
  "Summer Magic",
  "Alpha",
  "Beta",
  "Unlimited",
  "Mystery Booster",
  "The List",
  "WCD",
  "Anniversary",
  "Pro Tour",
  "International",
  "Revised",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Chronicles",
  "Anthologies",
  "Beatdown",
  "Battle Royale",
  "Collectors",
  "Foreign White Border",
  "Foreign Black Border",
  "Japanese",
];

describe("normalizeSettings", () => {
  it("returns the defaults for empty storage", () => {
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("drops unknown group ids and cleans pattern lists", () => {
    const settings = normalizeSettings({
      excludedGroups: ["promos", "no-such-group"],
      customExclusions: [" Foo ", "foo", "", "Bar"],
      alwaysInclude: "not a list",
    });
    expect(settings.excludedGroups).toEqual(["promos"]);
    expect(settings.customExclusions).toEqual(["Foo", "Bar"]);
    expect(settings.alwaysInclude).toEqual([]);
  });

  it("keeps only known, unique member ids", () => {
    expect(
      normalizeSettings({
        includedMembers: ["ub-hobbit", "ub-hobbit", "nope", 3],
      }).includedMembers,
    ).toEqual(["ub-hobbit"]);
  });

  it("clamps and rounds the expansion limit", () => {
    expect(
      normalizeSettings({ maxSelectedExpansions: 500 }).maxSelectedExpansions,
    ).toBe(100);
    expect(
      normalizeSettings({ maxSelectedExpansions: 0 }).maxSelectedExpansions,
    ).toBe(1);
    expect(
      normalizeSettings({ maxSelectedExpansions: "7.6" }).maxSelectedExpansions,
    ).toBe(8);
    expect(
      normalizeSettings({ maxSelectedExpansions: "x" }).maxSelectedExpansions,
    ).toBe(20);
  });

  it("converts the version 2.0 exclusion list", () => {
    const settings = normalizeSettings({
      excludedExpansions: [...LEGACY_DEFAULTS, "Masters"],
    });
    expect(settings.excludedGroups).toEqual(DEFAULT_EXCLUDED_GROUPS);
    expect(settings.customExclusions).toEqual(["Masters"]);
  });

  it("prefers the new keys over the version 2.0 list", () => {
    const settings = normalizeSettings({
      excludedGroups: [],
      excludedExpansions: LEGACY_DEFAULTS,
    });
    expect(settings.excludedGroups).toEqual([]);
  });
});

describe("migrateLegacyExclusions", () => {
  it("keeps a group off and its entries custom when the old list was partial", () => {
    const { excludedGroups, customExclusions } = migrateLegacyExclusions([
      "Alpha",
      "Beta",
      "Promo",
    ]);
    expect(excludedGroups).toEqual(["promos"]);
    expect(customExclusions).toEqual(["Alpha", "Beta"]);
  });

  it("matches entries without regard to case", () => {
    expect(migrateLegacyExclusions(["secret lair"]).excludedGroups).toEqual([
      "secret-lair",
    ]);
  });
});
