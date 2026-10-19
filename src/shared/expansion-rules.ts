import { EXPANSION_GROUPS } from "./expansion-groups";

export type ExpansionRules = {
  excludedGroups: readonly string[];
  includedMembers: readonly string[];
  customExclusions: readonly string[];
  alwaysInclude: readonly string[];
};

export type ExpansionVerdict =
  | {
      included: true;
      /** Set when a rule allowed a name that other rules would skip. */
      allowedBy?: "always-include" | "group-member";
      reason?: string;
    }
  | { included: false; reason: string };

type Rule = { patterns: string[]; reason: string };

const rule = (patterns: readonly string[], reason: string): Rule => ({
  patterns: patterns.map((p) => p.toLowerCase()),
  reason,
});

const matches = (lowerName: string, { patterns }: Rule): boolean =>
  patterns.some((pattern) => lowerName.includes(pattern));

/**
 * Builds a function that decides if Auto Select may pick an expansion.
 * Order: "Always include" entries win. Then each excluded group decides on
 * its own: an allowed member stops only that group from skipping the name.
 * Custom exclusions come last.
 */
export const createExpansionMatcher = ({
  excludedGroups,
  includedMembers,
  customExclusions,
  alwaysInclude,
}: ExpansionRules): ((name: string) => ExpansionVerdict) => {
  const includeRules = alwaysInclude.map((p) =>
    rule([p], `Always include "${p}"`),
  );
  const groups = EXPANSION_GROUPS.filter((group) =>
    excludedGroups.includes(group.id),
  ).map((group) => ({
    rule: rule(group.patterns, group.label),
    members: (group.members ?? []).map((member) => ({
      rule: rule(member.patterns, `${group.label}: ${member.label}`),
      allowed: includedMembers.includes(member.id),
    })),
  }));
  const customRules = customExclusions.map((p) => rule([p], `Custom "${p}"`));

  return (name) => {
    const lowerName = name.toLowerCase();

    const include = includeRules.find((r) => matches(lowerName, r));
    if (include) {
      return {
        included: true,
        allowedBy: "always-include",
        reason: include.reason,
      };
    }

    let allowedBy: string | undefined;
    for (const group of groups) {
      const member = group.members.find((m) => matches(lowerName, m.rule));
      if (member?.allowed) {
        allowedBy ??= `Allowed: ${member.rule.reason}`;
        continue;
      }
      if (member) return { included: false, reason: member.rule.reason };
      if (matches(lowerName, group.rule)) {
        return { included: false, reason: group.rule.reason };
      }
    }

    const custom = customRules.find((r) => matches(lowerName, r));
    if (custom) return { included: false, reason: custom.reason };

    return allowedBy
      ? { included: true, allowedBy: "group-member", reason: allowedBy }
      : { included: true };
  };
};

export type ExpansionOption = { id: string; name: string };

/**
 * Returns the first `limit` options, in page order, that the rules allow.
 */
export const pickExpansions = <T extends ExpansionOption>(
  options: readonly T[],
  rules: ExpansionRules,
  limit: number,
): T[] => {
  const matches = createExpansionMatcher(rules);
  return options
    .filter((option) => matches(option.name).included)
    .slice(0, Math.max(0, limit));
};
