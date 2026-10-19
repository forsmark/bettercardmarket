import { useEffect, useState } from "react";
import { DEFAULT_EXCLUDED_GROUPS } from "../shared/expansion-groups";
import {
  MAX_SELECTED_EXPANSIONS_RANGE,
  type Settings,
} from "../shared/settings";
import { GroupList } from "./components/GroupList";
import { NumberField } from "./components/NumberField";
import { PatternListEditor } from "./components/PatternListEditor";
import { PriceSettings } from "./components/PriceSettings";
import { RulePreview } from "./components/RulePreview";
import { Section } from "./components/Section";
import { SwitchField } from "./components/SwitchField";
import { TabPanel, Tabs } from "./components/Tabs";
import { type SaveState, useSettings } from "./use-settings";

const TABS = [
  { id: "auto-select", label: "Auto Select" },
  { id: "auto-list", label: "Auto list" },
  { id: "general", label: "General" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const readTabFromHash = (): TabId =>
  TABS.find((tab) => `#${tab.id}` === window.location.hash)?.id ??
  "auto-select";

const SaveStatus = ({ state }: { state: SaveState }) => {
  // Time stamp of the last "saved" message that has faded out.
  const [fadedAt, setFadedAt] = useState<number | null>(null);

  useEffect(() => {
    if (state.kind !== "saved") return;
    const timer = window.setTimeout(() => setFadedAt(state.at), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  const visible =
    state.kind === "error" || (state.kind === "saved" && fadedAt !== state.at);

  return (
    <p
      className="save-status"
      data-kind={state.kind}
      data-visible={visible}
      role="status"
    >
      {state.kind === "saved" && "Saved"}
      {state.kind === "error" && `Could not save: ${state.message}`}
    </p>
  );
};

const AutoSelectPanel = ({
  settings,
  update,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}) => {
  const groupsAreDefault =
    settings.excludedGroups.length === DEFAULT_EXCLUDED_GROUPS.length &&
    DEFAULT_EXCLUDED_GROUPS.every((id) => settings.excludedGroups.includes(id));

  return (
    <div className="auto-select">
      <div className="auto-select__rules">
        <Section title="Selection">
          <NumberField
            label="Expansions per card"
            description="Auto Select picks at most this many expansions, newest first."
            value={settings.maxSelectedExpansions}
            min={MAX_SELECTED_EXPANSIONS_RANGE.min}
            max={MAX_SELECTED_EXPANSIONS_RANGE.max}
            onChange={(maxSelectedExpansions) =>
              update({ maxSelectedExpansions })
            }
          />
        </Section>

        <Section
          title="Skip these groups"
          description="Each group skips expansions whose names contain one of its patterns."
          actions={
            <button
              type="button"
              className="button button--quiet"
              disabled={groupsAreDefault}
              onClick={() =>
                update({ excludedGroups: [...DEFAULT_EXCLUDED_GROUPS] })
              }
            >
              Restore default groups
            </button>
          }
        >
          <GroupList
            excluded={settings.excludedGroups}
            includedMembers={settings.includedMembers}
            onExcludedChange={(excludedGroups) => update({ excludedGroups })}
            onIncludedMembersChange={(includedMembers) =>
              update({ includedMembers })
            }
          />
        </Section>

        <Section
          title="Also skip"
          description="Skip expansions whose names contain any of these patterns. Case does not matter."
        >
          <PatternListEditor
            label="Custom exclusions"
            placeholder="Add a pattern, for example Masters"
            emptyText="No custom exclusions."
            patterns={settings.customExclusions}
            onChange={(customExclusions) => update({ customExclusions })}
          />
        </Section>

        <Section
          title="Always include"
          description="Expansions that match these patterns are never skipped, even when a group or pattern above matches them."
        >
          <PatternListEditor
            label="Always include"
            placeholder="Add a pattern, for example Commander Masters"
            emptyText="Nothing overrides the exclusions."
            patterns={settings.alwaysInclude}
            onChange={(alwaysInclude) => update({ alwaysInclude })}
          />
        </Section>
      </div>

      <RulePreview rules={settings} limit={settings.maxSelectedExpansions} />
    </div>
  );
};

const AutoListPanel = ({
  settings,
  update,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}) => (
  <div className="single-column">
    <Section title="Defaults">
      <SwitchField
        label="Auto-select expansions for each card"
        description="Sets the default of the same option in the Auto list dialog."
        checked={settings.autoSelectOnAutoList}
        onChange={(autoSelectOnAutoList) => update({ autoSelectOnAutoList })}
      />
    </Section>
    <Section title="Decklist format">
      <ul className="formats">
        <li>
          <code>4 Arbor Elf</code>, <code>4x Arbor Elf</code> or{" "}
          <code>Arbor Elf</code> for one copy
        </li>
        <li>
          Set codes and collector numbers are removed:{" "}
          <code>1 Sol Ring (CMM) 400</code>
        </li>
        <li>
          Comments (<code>//</code>, <code>#</code>) and headers such as{" "}
          <code>Sideboard</code> are skipped
        </li>
        <li>Repeated cards are added once, with the quantities added up</li>
      </ul>
    </Section>
  </div>
);

const GeneralPanel = ({
  settings,
  update,
  reset,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}) => {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  return (
    <div className="single-column">
      <Section title="Prices">
        <PriceSettings
          showPrices={settings.showPrices}
          onShowPricesChange={(showPrices) => update({ showPrices })}
        />
      </Section>
      <Section title="Troubleshooting">
        <SwitchField
          label="Debug logging"
          description="Writes each Auto Select and Auto list step to the console of the Cardmarket tab."
          checked={settings.debugLogging}
          onChange={(debugLogging) => update({ debugLogging })}
        />
      </Section>
      <Section
        title="Reset"
        description="Restores all settings on this page to their defaults. Settings sync to every browser where you are signed in."
      >
        <div>
          <button
            type="button"
            className={confirming ? "button button--danger" : "button"}
            onClick={() => {
              if (!confirming) return setConfirming(true);
              setConfirming(false);
              reset();
            }}
          >
            {confirming
              ? "Click again to reset all settings"
              : "Reset all settings"}
          </button>
        </div>
      </Section>
    </div>
  );
};

export const App = () => {
  const { settings, saveState, update, reset } = useSettings();
  const [tab, setTab] = useState<TabId>(readTabFromHash);

  useEffect(() => {
    const onHashChange = () => setTab(readTabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const selectTab = (id: TabId) => {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__title">
          <h1>Better CardMarket</h1>
          <p className="masthead__version">
            v{chrome.runtime.getManifest().version}
          </p>
        </div>
        <SaveStatus state={saveState} />
      </header>

      <Tabs tabs={TABS} selected={tab} onSelect={selectTab} label="Settings" />

      {settings ? (
        <main>
          <TabPanel id="auto-select" hidden={tab !== "auto-select"}>
            <AutoSelectPanel settings={settings} update={update} />
          </TabPanel>
          <TabPanel id="auto-list" hidden={tab !== "auto-list"}>
            <AutoListPanel settings={settings} update={update} />
          </TabPanel>
          <TabPanel id="general" hidden={tab !== "general"}>
            <GeneralPanel settings={settings} update={update} reset={reset} />
          </TabPanel>
        </main>
      ) : (
        <p className="loading">Loading settings…</p>
      )}
    </div>
  );
};
