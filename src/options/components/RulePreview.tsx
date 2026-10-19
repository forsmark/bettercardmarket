import { useEffect, useId, useMemo, useState } from "react";
import {
  createExpansionMatcher,
  type ExpansionRules,
} from "../../shared/expansion-rules";
import {
  loadRecentExpansions,
  type RecentExpansions,
  subscribeToRecentExpansions,
} from "../../shared/recent-expansions";

type Filter = "all" | "picked" | "skipped";
type Status = "picked" | "over-limit" | "skipped";

type PreviewRow = {
  name: string;
  status: Status;
  reason?: string;
  allowedBy?: "always-include" | "group-member";
};

const ALLOWED_LABEL = {
  "always-include": "Always included",
  "group-member": "Allowed",
} as const;

const describeRow = (row: PreviewRow): string =>
  row.reason ?? STATUS_LABEL[row.status];

const STATUS_LABEL: Record<Status, string> = {
  picked: "Picked",
  "over-limit": "Over limit",
  skipped: "Skipped",
};

const useRecentExpansions = () => {
  const [recent, setRecent] = useState<RecentExpansions | null>(null);
  useEffect(() => {
    let active = true;
    void loadRecentExpansions().then((value) => {
      if (active) setRecent(value);
    });
    const unsubscribe = subscribeToRecentExpansions(setRecent);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return recent;
};

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);

/** Name tester: shows the verdict for any expansion name. */
const NameTester = ({ rules }: { rules: ExpansionRules }) => {
  const id = useId();
  const [name, setName] = useState("");
  const verdict = useMemo(
    () => (name.trim() ? createExpansionMatcher(rules)(name.trim()) : null),
    [name, rules],
  );

  return (
    <div className="tester">
      <label htmlFor={id} className="field__label">
        Test an expansion name
      </label>
      <input
        id={id}
        className="input"
        value={name}
        placeholder="Commander Masters: Extras"
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => setName(event.target.value)}
      />
      <p className="tester__result" aria-live="polite">
        {verdict &&
          (verdict.included ? (
            <>
              <span className="status status--picked">Allowed</span>
              {verdict.reason && (
                <span className="tester__reason">{verdict.reason}</span>
              )}
            </>
          ) : (
            <>
              <span className="status status--skipped">Skipped</span>
              <span className="tester__reason">{verdict.reason}</span>
            </>
          ))}
      </p>
    </div>
  );
};

/**
 * Shows what Auto Select picks from the expansion list of the last card it
 * ran on, with the current rules.
 */
export const RulePreview = ({
  rules,
  limit,
}: {
  rules: ExpansionRules;
  limit: number;
}) => {
  const recent = useRecentExpansions();
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo<PreviewRow[]>(() => {
    if (!recent) return [];
    const matches = createExpansionMatcher(rules);
    let picked = 0;
    return recent.names.map((name) => {
      const verdict = matches(name);
      if (!verdict.included)
        return { name, status: "skipped", reason: verdict.reason };
      picked += 1;
      return {
        name,
        status: picked <= limit ? "picked" : "over-limit",
        reason: verdict.reason,
        allowedBy: verdict.allowedBy,
      };
    });
  }, [recent, rules, limit]);

  const pickedCount = rows.filter((r) => r.status === "picked").length;
  const visible = rows.filter(
    (row) =>
      filter === "all" ||
      (filter === "picked" ? row.status === "picked" : row.status !== "picked"),
  );

  return (
    <aside className="preview" aria-labelledby="preview-title">
      <header className="preview__header">
        <h2 id="preview-title" className="preview__title">
          Preview
        </h2>
        {recent && (
          <p className="preview__card">
            <strong>{recent.card}</strong>
            <span className="preview__time">{formatTime(recent.seenAt)}</span>
          </p>
        )}
      </header>

      {recent ? (
        <>
          <div className="preview__meter">
            <p className="preview__count">
              <strong>{pickedCount}</strong> of {rows.length} expansions picked
            </p>
            <div className="meter" aria-hidden="true">
              <div
                className="meter__fill foil"
                style={{
                  width: `${rows.length ? (pickedCount / rows.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="segmented" role="radiogroup" aria-label="Show">
            {(["all", "picked", "skipped"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={filter === value}
                className="segmented__option"
                onClick={() => setFilter(value)}
              >
                {value === "all" ? "All" : STATUS_LABEL[value]}
              </button>
            ))}
          </div>

          <ul className="preview__list">
            {visible.map((row) => (
              <li key={row.name} className="printing" data-status={row.status}>
                <span className="printing__pip" aria-hidden="true" />
                <span className="printing__name">{row.name}</span>
                <span className="printing__status" title={describeRow(row)}>
                  {row.status === "picked" && row.allowedBy
                    ? ALLOWED_LABEL[row.allowedBy]
                    : describeRow(row)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="preview__empty">
          Click Auto Select on a Cardmarket wants list. The expansions of that
          card show here, so you can see the effect of each rule.
        </p>
      )}

      <NameTester rules={rules} />
    </aside>
  );
};
