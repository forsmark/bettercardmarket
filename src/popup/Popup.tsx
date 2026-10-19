import { useEffect, useState } from "react";
import {
  clearPocket,
  formatPocket,
  type PocketEntry,
  pocketTotals,
  removeFromPocket,
} from "../shared/pocket";
import { euros, plural } from "../shared/format";
import { usePocket } from "./use-pocket";

/** Shows `label` for a short time after an action, then resets. */
const useFlash = (): [string | null, (label: string) => void] => {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!label) return;
    const timer = window.setTimeout(() => setLabel(null), 2500);
    return () => window.clearTimeout(timer);
  }, [label]);
  return [label, setLabel];
};

const PocketRow = ({ entry }: { entry: PocketEntry }) => (
  <li className="pocket-row">
    <span className="pocket-row__quantity">{entry.quantity}</span>
    <span className="pocket-row__name" title={entry.name}>
      {entry.name}
    </span>
    <span className="pocket-row__price">
      {entry.estimate === null ? "–" : euros(entry.estimate)}
    </span>
    <button
      type="button"
      className="pocket-row__remove"
      aria-label={`Remove ${entry.name}`}
      onClick={() => void removeFromPocket([entry.name])}
    >
      ×
    </button>
  </li>
);

export const Popup = () => {
  const pocket = usePocket();
  const [copied, flashCopied] = useFlash();
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!confirmClear) return;
    const timer = window.setTimeout(() => setConfirmClear(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmClear]);

  const totals = pocket ? pocketTotals(pocket) : null;
  const empty = !pocket?.length;

  return (
    <div className="popup">
      <header className="popup__header">
        <h1 className="popup__title">Pocket</h1>
        <button
          type="button"
          className="popup__link"
          onClick={() => void chrome.runtime.openOptionsPage()}
        >
          Settings
        </button>
      </header>

      {pocket === null ? null : empty ? (
        <div className="popup__empty">
          <p>The pocket is empty.</p>
          <p>
            On a Cardmarket wants list, check the cards you want and click{" "}
            <strong>Add to pocket</strong>. Cards from several lists add up
            here.
          </p>
        </div>
      ) : (
        <>
          <section className="popup__total" aria-label="Total">
            <p className="popup__price">
              {euros(totals?.estimate ?? 0)}
              <span className="popup__price-label">estimated</span>
            </p>
            <p className="popup__counts">
              {plural(totals?.cards ?? 0, "card")}
              {totals?.unpricedCards
                ? ` · ${totals.unpricedCards} without a price`
                : ""}
            </p>
          </section>

          <ul className="pocket-list" aria-label="Cards in the pocket">
            {pocket.map((entry) => (
              <PocketRow key={entry.name} entry={entry} />
            ))}
          </ul>

          <footer className="popup__actions">
            <button
              type="button"
              className="button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(formatPocket(pocket))
                  .then(() => flashCopied("Copied"));
              }}
            >
              {copied ?? "Copy list"}
            </button>
            <button
              type="button"
              className={
                confirmClear ? "button button--danger" : "button button--quiet"
              }
              onClick={() => {
                if (!confirmClear) return setConfirmClear(true);
                setConfirmClear(false);
                void clearPocket();
              }}
            >
              {confirmClear ? "Click again to clear" : "Clear"}
            </button>
          </footer>
          <p className="popup__hint">
            To add these cards to a wants list, open its Add cards page and
            choose Auto list › From pocket.
          </p>
        </>
      )}
    </div>
  );
};
