import type { WantsTableRow } from "../cardmarket/page";

const ROW_BOX = 'input[name="checkWantsRow[]"]';
const ALL_BOX = 'input[name="checkAll"]';

const readSelection = (rows: readonly WantsTableRow[]): Set<string> =>
  new Set(
    rows
      .filter(
        (row) => row.row.querySelector<HTMLInputElement>(ROW_BOX)?.checked,
      )
      .map((row) => row.wantId),
  );

/**
 * Calls `onChange` with the ids of the checked wants each time the user
 * checks a row or uses "select all".
 */
export const watchSelection = (
  table: HTMLTableElement,
  rows: readonly WantsTableRow[],
  onChange: (selected: Set<string>) => void,
): void => {
  table.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches(`${ROW_BOX}, ${ALL_BOX}`)) return;
    // "Select all" sets the row boxes in its own handler, without events.
    // Read the boxes after that handler has run.
    setTimeout(() => onChange(readSelection(rows)), 0);
  });
  onChange(readSelection(rows));
};
