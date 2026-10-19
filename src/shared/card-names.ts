/** Lowercases, removes accents and turns punctuation into single spaces. */
export const normalizeCardName = (name: string): string =>
  name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Returns the front face of a multi-face card name. Scryfall separates faces
 * with " // ". Cardmarket uses " // " or " / ".
 */
export const frontFaceName = (name: string): string =>
  name.split(/\s+\/\/?\s+/)[0]?.trim() ?? name.trim();

/** Key that matches the same card in Cardmarket and Scryfall names. */
export const cardKey = (name: string): string =>
  normalizeCardName(frontFaceName(name));
