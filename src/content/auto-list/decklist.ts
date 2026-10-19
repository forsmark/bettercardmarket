export type DeckEntry = { quantity: number; name: string };

const SECTION_HEADER =
  /^(about|deck|main\s*deck|mainboard|sideboard|commander|companion|maybeboard|considering|tokens?)\b.*$|:$/i;
const QUANTITY_PREFIX = /^(\d+)\s*x?\s+(.+)$/i;
// "SB: 2 Card" from older MWS and Cockatrice exports.
const SIDEBOARD_PREFIX = /^SB:\s*/i;
// Foil and etched markers from Moxfield and Archidekt exports.
const FINISH_SUFFIX = /\s+\*[A-Z]\*$/i;
// "(CMM) 400", "(PLST) LRW-256" or "[M10]" after the card name.
const SET_SUFFIX = /\s+(\([A-Z0-9]{2,6}\)(\s+\S+)?|\[[^\]]+\])$/i;

const parseLine = (rawLine: string): DeckEntry | null => {
  const line = rawLine.trim().replace(SIDEBOARD_PREFIX, "");
  if (!line || line.startsWith("//") || line.startsWith("#")) return null;

  const match = QUANTITY_PREFIX.exec(line);
  if (!match && SECTION_HEADER.test(line)) return null;

  const quantity = match ? Number(match[1]) : 1;
  const name = (match?.[2] ?? line)
    .replace(FINISH_SUFFIX, "")
    .replace(SET_SUFFIX, "")
    .trim();

  if (!name || !Number.isInteger(quantity) || quantity < 1) return null;
  return { quantity, name };
};

/**
 * Parses a pasted decklist. Accepts "4 Card", "4x Card" and "Card" lines,
 * removes set codes and finish markers, skips comments and section headers,
 * and adds up the quantities of repeated cards.
 */
export const parseDecklist = (text: string): DeckEntry[] => {
  const entries = new Map<string, DeckEntry>();

  for (const line of text.split(/\r?\n/)) {
    const entry = parseLine(line);
    if (!entry) continue;

    const key = entry.name.toLowerCase();
    const existing = entries.get(key);
    if (existing) existing.quantity += entry.quantity;
    else entries.set(key, entry);
  }

  return [...entries.values()];
};

export const formatDecklist = (entries: readonly DeckEntry[]): string =>
  entries.map((e) => `${e.quantity} ${e.name}`).join("\n");
