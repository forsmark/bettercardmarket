import { describe, expect, it } from "vitest";
import { cardKey, frontFaceName, normalizeCardName } from "./card-names";

describe("normalizeCardName", () => {
  it("removes accents, case and punctuation", () => {
    expect(normalizeCardName("Lim-Dûl's Vault")).toBe("lim dul s vault");
    expect(normalizeCardName("Fire // Ice")).toBe("fire ice");
  });
});

describe("frontFaceName", () => {
  it("handles the Scryfall and Cardmarket face separators", () => {
    expect(frontFaceName("Brazen Borrower // Petty Theft")).toBe(
      "Brazen Borrower",
    );
    expect(frontFaceName("Delver of Secrets / Insectile Aberration")).toBe(
      "Delver of Secrets",
    );
    expect(frontFaceName("Sol Ring")).toBe("Sol Ring");
  });
});

describe("cardKey", () => {
  it("gives the same key for both sites' names of a card", () => {
    expect(cardKey("Delver of Secrets / Insectile Aberration")).toBe(
      cardKey("Delver of Secrets // Insectile Aberration"),
    );
  });
});
