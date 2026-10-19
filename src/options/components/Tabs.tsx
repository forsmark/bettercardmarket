import { type KeyboardEvent, type ReactNode, useRef } from "react";

export type TabItem<Id extends string> = { id: Id; label: string };

type TabsProps<Id extends string> = {
  tabs: readonly TabItem<Id>[];
  selected: Id;
  onSelect: (id: Id) => void;
  label: string;
};

const tabId = (id: string) => `tab-${id}`;
const panelId = (id: string) => `panel-${id}`;

/** Tab list with arrow-key, Home and End navigation. */
export const Tabs = <Id extends string>({
  tabs,
  selected,
  onSelect,
  label,
}: TabsProps<Id>) => {
  const refs = useRef(new Map<Id, HTMLButtonElement>());

  const onKeyDown = (event: KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.id === selected);
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    const tab = next === null ? undefined : tabs[next];
    if (!tab) return;
    event.preventDefault();
    onSelect(tab.id);
    refs.current.get(tab.id)?.focus();
  };

  return (
    <div
      className="tabs"
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab) => {
        const active = tab.id === selected;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) refs.current.set(tab.id, el);
            }}
            id={tabId(tab.id)}
            type="button"
            role="tab"
            className="tabs__tab"
            aria-selected={active}
            aria-controls={panelId(tab.id)}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export const TabPanel = ({
  id,
  hidden,
  children,
}: {
  id: string;
  hidden: boolean;
  children: ReactNode;
}) => (
  <div
    id={panelId(id)}
    role="tabpanel"
    aria-labelledby={tabId(id)}
    hidden={hidden}
    className="tab-panel"
  >
    {children}
  </div>
);
