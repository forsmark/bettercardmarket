// Cardmarket's English pages also write prices as "1,30 €".
const euroFormat = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export const euros = (value: number): string => euroFormat.format(value);

export const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;
