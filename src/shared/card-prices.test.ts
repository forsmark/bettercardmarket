import { describe, expect, it } from "vitest";
import {
  buildPrintQueries,
  estimateWant,
  groupPrints,
  type PrintPrice,
} from "./card-prices";

describe("buildPrintQueries", () => {
  it("joins exact front-face names with 'or'", () => {
    expect(
      buildPrintQueries([
        "Sol Ring",
        "Delver of Secrets / Insectile Aberration",
      ]),
    ).toEqual(['(!"Sol Ring" or !"Delver of Secrets")']);
  });

  it("escapes quotes in names", () => {
    expect(buildPrintQueries(['Kongming, "Sleeping Dragon"'])).toEqual([
      '(!"Kongming, \\"Sleeping Dragon\\"")',
    ]);
  });

  it("splits long lists into queries of at most 900 characters", () => {
    const names = Array.from({ length: 80 }, (_, i) => `Card Number ${i}`);
    const queries = buildPrintQueries(names);
    expect(queries.length).toBeGreaterThan(1);
    for (const query of queries) expect(query.length).toBeLessThanOrEqual(900);
    expect(queries.join(" ").match(/!"/g)).toHaveLength(80);
  });
});

describe("groupPrints", () => {
  it("groups printings by front face and parses prices", () => {
    const grouped = groupPrints([
      {
        name: "Brazen Borrower // Petty Theft",
        set_name: "Throne of Eldraine",
        cardmarket_id: 401774,
        prices: { eur: "1.52", eur_foil: "7.94" },
      },
      {
        name: "Brazen Borrower // Petty Theft",
        set_name: "Magic Online Promos",
        cardmarket_id: null,
        prices: { eur: null },
      },
    ]);
    expect(grouped).toEqual({
      "brazen borrower": [
        {
          cardmarketId: 401774,
          setName: "Throne of Eldraine",
          eur: 1.52,
          eurFoil: 7.94,
        },
      ],
    });
  });
});

describe("estimateWant", () => {
  const prints: PrintPrice[] = [
    { cardmarketId: 1, setName: "Cheap", eur: 0.2, eurFoil: 3 },
    { cardmarketId: 2, setName: "Pricey", eur: 5, eurFoil: 1 },
    { cardmarketId: 3, setName: "No price", eur: null, eurFoil: null },
  ];
  const base = { amount: 2, allProductIds: [1, 2, 3], prints };

  it("uses the cheapest selected printing times the quantity", () => {
    expect(estimateWant({ ...base, foil: "no", productIds: [1, 2] })).toEqual({
      unitPrice: 0.2,
      totalPrice: 0.4,
      setName: "Cheap",
    });
  });

  it("allows every printing when no expansion is selected", () => {
    expect(estimateWant({ ...base, foil: "no", productIds: [] })?.setName).toBe(
      "Cheap",
    );
  });

  it("uses foil prices for foil wants", () => {
    expect(
      estimateWant({ ...base, foil: "yes", productIds: [1, 2] })?.unitPrice,
    ).toBe(1);
  });

  it("uses the lower of both prices when foil does not matter", () => {
    expect(
      estimateWant({ ...base, foil: "any", productIds: [2] })?.unitPrice,
    ).toBe(1);
  });

  it("returns null when no allowed printing has a price", () => {
    expect(estimateWant({ ...base, foil: "no", productIds: [3] })).toBeNull();
  });
});
