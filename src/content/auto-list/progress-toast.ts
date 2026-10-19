import { h } from "../lib/dom";
import { formatDecklist } from "./decklist";
import type { AutoListProgress, AutoListResult } from "./run-auto-list";

const AUTO_CLOSE_MS = 4_000;

export type ProgressToast = {
  update: (progress: AutoListProgress) => void;
  finish: (result: AutoListResult) => void;
  fail: (message: string) => void;
};

const summarize = (result: AutoListResult, total: number): string => {
  const mergedCount = result.added.filter((e) => e.merged).length;
  const parts = [
    result.cancelled ? "Cancelled." : result.skipped.length ? "" : "Done.",
    `Added ${result.added.length} of ${total} cards.`,
    mergedCount
      ? `${mergedCount} merged into existing wants. Check their details.`
      : "",
    result.skipped.length ? `Skipped ${result.skipped.length}:` : "",
  ];
  return parts.filter(Boolean).join(" ");
};

/**
 * Shows Auto list progress in the bottom-right corner. The page stays usable
 * while it runs.
 */
export const showProgressToast = (
  total: number,
  onCancel: () => void,
): ProgressToast => {
  const status = h("span", {
    className: "bcm-toast__status",
    text: "Starting…",
  });
  const count = h("span", {
    className: "bcm-toast__count",
    text: `0/${total}`,
  });
  const bar = h("div", { className: "bcm-toast__bar" });
  const progress = h(
    "div",
    {
      className: "bcm-toast__progress",
      attrs: {
        role: "progressbar",
        "aria-label": "Auto list progress",
        "aria-valuemin": "0",
        "aria-valuemax": String(total),
        "aria-valuenow": "0",
      },
    },
    [bar],
  );
  const actionButton = h("button", {
    className: "btn btn-outline-light btn-sm",
    text: "Cancel",
    attrs: { type: "button" },
  });
  const details = h("div", { className: "bcm-toast__details" });

  const toast = h(
    "section",
    { className: "bcm-toast", attrs: { "aria-label": "Auto list" } },
    [
      h("header", { className: "bcm-toast__header" }, [
        h("strong", { text: "Auto list" }),
        actionButton,
      ]),
      h("div", { className: "bcm-toast__row", attrs: { role: "status" } }, [
        status,
        count,
      ]),
      progress,
      details,
    ],
  );
  document.body.append(toast);

  let finished = false;
  const close = () => toast.remove();

  actionButton.addEventListener("click", () => {
    if (finished) return close();
    actionButton.disabled = true;
    status.textContent = "Cancelling…";
    onCancel();
  });

  const showCloseButton = () => {
    finished = true;
    actionButton.disabled = false;
    actionButton.textContent = "Close";
  };

  const setProgress = (done: number) => {
    bar.style.width = `${total ? (done / total) * 100 : 100}%`;
    progress.setAttribute("aria-valuenow", String(done));
    count.textContent = `${done}/${total}`;
  };

  return {
    update: ({ index, entry, step }) => {
      if (actionButton.disabled) return;
      const verb = step === "searching" ? "Searching" : "Adding";
      status.textContent = `${verb}: ${entry.quantity} ${entry.name}`;
      setProgress(index);
    },

    fail: (message) => {
      showCloseButton();
      status.textContent = message;
    },

    finish: (result) => {
      showCloseButton();
      setProgress(result.added.length + result.skipped.length);
      status.textContent = summarize(result, total);

      if (result.skipped.length) {
        const list = h(
          "ul",
          { className: "bcm-toast__skipped" },
          result.skipped.map((s) =>
            h("li", {}, [
              h("span", { text: `${s.quantity} ${s.name}` }),
              h("span", { className: "bcm-toast__reason", text: s.reason }),
            ]),
          ),
        );
        const copyButton = h("button", {
          className: "btn btn-outline-light btn-sm",
          text: "Copy skipped cards",
          attrs: { type: "button" },
        });
        copyButton.addEventListener("click", () => {
          void navigator.clipboard
            .writeText(formatDecklist(result.skipped))
            .then(() => (copyButton.textContent = "Copied"));
        });
        details.append(list, copyButton);
      } else if (!result.cancelled) {
        setTimeout(close, AUTO_CLOSE_MS);
      }
    },
  };
};
