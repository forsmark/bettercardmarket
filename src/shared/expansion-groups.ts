/**
 * Named groups of Cardmarket expansions that Auto Select can skip. A group
 * matches an expansion when the expansion name contains one of its patterns
 * (case-insensitive).
 */
export type ExpansionGroup = {
  id: string;
  label: string;
  description: string;
  patterns: readonly string[];
  /**
   * Parts of the group that the user can allow one by one while the group is
   * on. Ids are unique across all groups.
   */
  members?: readonly ExpansionGroupMember[];
  excludedByDefault: boolean;
  /**
   * Entries of the old flat exclusion list (version 2.0) that this group
   * replaces. Used once, to convert stored settings.
   */
  legacyPatterns?: readonly string[];
};

export type ExpansionGroupMember = {
  id: string;
  label: string;
  patterns: readonly string[];
};

export const EXPANSION_GROUPS: readonly ExpansionGroup[] = [
  {
    id: "special-frames",
    label: "Borderless, showcase and extended art",
    description:
      'Cardmarket lists these printings in the ": Extras" expansions.',
    patterns: ["Extras"],
    excludedByDefault: true,
  },
  {
    id: "retro-frame",
    label: "Retro frame",
    description: "Reprints in the pre-2003 card frame.",
    patterns: ["Retro"],
    excludedByDefault: true,
  },
  {
    id: "secret-lair",
    label: "Secret Lair",
    description: "All Secret Lair drops and superdrops.",
    patterns: ["Secret Lair"],
    excludedByDefault: true,
  },
  {
    id: "promos",
    label: "Promos",
    description:
      "Prerelease, FNM, Buy a Box, judge, store and event promo printings.",
    patterns: ["Promo"],
    excludedByDefault: true,
  },
  {
    id: "universes-beyond",
    label: "Universes Beyond",
    description:
      'Crossover sets with other franchises, and all sets named "Universes Beyond: …".',
    patterns: ["Universes Beyond"],
    members: [
      {
        id: "ub-lord-of-the-rings",
        label: "The Lord of the Rings",
        patterns: ["Lord of the Rings"],
      },
      { id: "ub-hobbit", label: "The Hobbit", patterns: ["The Hobbit"] },
      {
        id: "ub-final-fantasy",
        label: "FINAL FANTASY",
        patterns: ["Final Fantasy"],
      },
      { id: "ub-marvel", label: "Marvel", patterns: ["Marvel"] },
      {
        id: "ub-avatar",
        label: "Avatar: The Last Airbender",
        patterns: ["Avatar: The Last Airbender"],
      },
      {
        id: "ub-tmnt",
        label: "Teenage Mutant Ninja Turtles",
        patterns: ["Teenage Mutant Ninja Turtles"],
      },
      { id: "ub-doctor-who", label: "Doctor Who", patterns: ["Doctor Who"] },
      { id: "ub-fallout", label: "Fallout", patterns: ["Fallout"] },
      {
        id: "ub-warhammer",
        label: "Warhammer 40,000",
        patterns: ["Warhammer"],
      },
      {
        id: "ub-assassins-creed",
        label: "Assassin's Creed",
        patterns: ["Assassin's Creed"],
      },
      {
        id: "ub-jurassic-world",
        label: "Jurassic World",
        patterns: ["Jurassic World"],
      },
      {
        id: "ub-transformers",
        label: "Transformers",
        patterns: ["Transformers"],
      },
    ],
    excludedByDefault: true,
  },
  {
    id: "early-sets",
    label: "Alpha, Beta, Unlimited and Summer Magic",
    description: "Early printings that cost much more than later reprints.",
    patterns: ["Alpha", "Beta", "Unlimited", "Summer Magic"],
    excludedByDefault: true,
  },
  {
    id: "white-border",
    label: "White-bordered reprints",
    description: "Revised to Eighth Edition, Chronicles and similar sets.",
    patterns: [
      "Revised",
      "Fourth Edition",
      "Fifth Edition",
      "Sixth Edition",
      "Seventh Edition",
      "Eighth Edition",
      "Chronicles",
      "Anthologies",
      "Beatdown",
      "Battle Royale",
      "Collectors",
    ],
    legacyPatterns: [
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
    ],
    excludedByDefault: true,
  },
  {
    id: "collector-reprints",
    label: "Gold-bordered and collector reprints",
    description:
      "World Championship Decks, Pro Tour Collector Set, The List, Mystery Booster, anniversary and International editions.",
    patterns: [
      "Mystery Booster",
      "The List",
      "WCD",
      "Anniversary",
      "Pro Tour",
      "International",
    ],
    excludedByDefault: true,
  },
  {
    id: "foreign-only",
    label: "Foreign-language-only printings",
    description: "Printings that exist only in some languages.",
    patterns: [
      "Foreign White Border",
      "Foreign Black Border",
      "Japanese",
      "Simplified Chinese",
    ],
    legacyPatterns: [
      "Foreign White Border",
      "Foreign Black Border",
      "Japanese",
    ],
    excludedByDefault: true,
  },
  {
    id: "commander",
    label: "Commander products",
    description:
      "Commander precons, Commander Masters, Commander Legends and Commander Collection.",
    patterns: ["Commander"],
    excludedByDefault: false,
  },
  {
    id: "masterpieces",
    label: "Masterpiece series",
    description:
      "Expeditions, Inventions, Invocations and the Mystical Archive.",
    patterns: [
      "Expeditions",
      "Inventions",
      "Invocations",
      "Mystical Archive",
      "Masterpiece",
    ],
    excludedByDefault: false,
  },
  {
    id: "premium-decks",
    label: "Duel Decks and premium collections",
    description:
      "Duel Decks, From the Vault, Premium Deck Series, Signature Spellbook and Guild Kits.",
    patterns: [
      "Duel Decks",
      "From the Vault",
      "Premium Deck Series",
      "Signature Spellbook",
      "Guild Kits",
    ],
    excludedByDefault: false,
  },
  {
    id: "beginner-products",
    label: "Beginner products",
    description: "Portal, Starter, Jumpstart, theme decks and two-player sets.",
    patterns: [
      "Portal",
      "Starter",
      "Jumpstart",
      "Theme Decks",
      "Introductory",
      "Welcome Deck",
    ],
    excludedByDefault: false,
  },
  {
    id: "un-sets",
    label: "Un-sets",
    description: "Unglued, Unhinged, Unstable, Unsanctioned and Unfinity.",
    patterns: ["Unglued", "Unhinged", "Unstable", "Unsanctioned", "Unfinity"],
    excludedByDefault: false,
  },
  {
    id: "oddities",
    label: "Oversized cards, misprints and promo lands",
    description:
      "Box toppers, oversized cards, misprints and APAC, Euro and Guru lands.",
    patterns: [
      "Oversized",
      "Misprints",
      "APAC Lands",
      "Euro Lands",
      "Guru Lands",
    ],
    excludedByDefault: false,
  },
];

export const DEFAULT_EXCLUDED_GROUPS: readonly string[] =
  EXPANSION_GROUPS.filter((group) => group.excludedByDefault).map(
    (group) => group.id,
  );

const GROUP_IDS = new Set(EXPANSION_GROUPS.map((group) => group.id));
const MEMBER_IDS = new Set(
  EXPANSION_GROUPS.flatMap((group) => group.members ?? []).map((m) => m.id),
);

export const isExpansionGroupId = (value: unknown): value is string =>
  typeof value === "string" && GROUP_IDS.has(value);

export const isGroupMemberId = (value: unknown): value is string =>
  typeof value === "string" && MEMBER_IDS.has(value);

/**
 * Converts the flat exclusion list of version 2.0 into groups and custom
 * entries. A group is on only when the old list holds all of its patterns, so
 * the converted rules exclude the same expansions as before.
 */
export const migrateLegacyExclusions = (
  legacy: readonly string[],
): { excludedGroups: string[]; customExclusions: string[] } => {
  const remaining = new Map(
    legacy.map((entry) => [entry.toLowerCase(), entry]),
  );
  const excludedGroups: string[] = [];

  for (const group of EXPANSION_GROUPS) {
    const patterns = (group.legacyPatterns ?? group.patterns).map((p) =>
      p.toLowerCase(),
    );
    if (!patterns.every((pattern) => remaining.has(pattern))) continue;
    excludedGroups.push(group.id);
    for (const pattern of patterns) remaining.delete(pattern);
  }

  return { excludedGroups, customExclusions: [...remaining.values()] };
};
