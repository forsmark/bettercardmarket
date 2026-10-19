import { describe, expect, it } from "vitest";
import { normalizeCardName, pickSuggestion } from "./card-search";

const suggest = (...labels: string[]) =>
  labels.map((label) => ({ label, value: label }));

describe("normalizeCardName", () => {
  it("removes accents, case and punctuation", () => {
    expect(normalizeCardName("Lim-Dûl's Vault")).toBe("lim dul s vault");
    expect(normalizeCardName("Fire // Ice")).toBe("fire ice");
  });
});

describe("pickSuggestion", () => {
  it("prefers an exact match over a longer name", () => {
    expect(
      pickSuggestion(
        suggest("Lightning Bolt Ascendancy", "Lightning Bolt"),
        "lightning bolt",
      ),
    ).toBe("Lightning Bolt");
  });

  it("matches the front face of a double-faced card", () => {
    expect(
      pickSuggestion(
        suggest("Delver of Secrets // Insectile Aberration"),
        "Delver of Secrets",
      ),
    ).toBe("Delver of Secrets // Insectile Aberration");
  });

  it("ignores punctuation differences", () => {
    expect(
      pickSuggestion(
        suggest("Jace, the Mind Sculptor"),
        "Jace the Mind Sculptor",
      ),
    ).toBe("Jace, the Mind Sculptor");
  });

  it("returns null when no suggestion contains the name", () => {
    expect(
      pickSuggestion(suggest("Lightning Helix"), "Lightning Bolt"),
    ).toBeNull();
  });
});
