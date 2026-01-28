import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "./scripts/settings";

const textarea = document.getElementById(
  "excludedExpansions",
) as HTMLTextAreaElement | null;
const autoSelectCheckbox = document.getElementById(
  "autoSelectOnAutoList",
) as HTMLInputElement | null;
const saveButton = document.getElementById(
  "saveSettings",
) as HTMLButtonElement | null;
const resetButton = document.getElementById(
  "resetDefaults",
) as HTMLButtonElement | null;
const status = document.getElementById("status") as HTMLDivElement | null;

const formatList = (items: string[]): string => items.join("\n");

const parseList = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const setStatus = (message: string): void => {
  if (!status) return;
  status.textContent = message;
  if (message) {
    window.setTimeout(() => {
      if (status.textContent === message) status.textContent = "";
    }, 2000);
  }
};

const loadForm = async (): Promise<void> => {
  const settings = await loadSettings();
  if (textarea) textarea.value = formatList(settings.excludedExpansions);
  if (autoSelectCheckbox)
    autoSelectCheckbox.checked = settings.autoSelectOnAutoList;
};

const saveForm = async (): Promise<void> => {
  if (!textarea || !autoSelectCheckbox) return;

  await saveSettings({
    excludedExpansions: parseList(textarea.value),
    autoSelectOnAutoList: autoSelectCheckbox.checked,
  });

  setStatus("Settings saved.");
};

const resetDefaults = async (): Promise<void> => {
  if (textarea)
    textarea.value = formatList(DEFAULT_SETTINGS.excludedExpansions);
  if (autoSelectCheckbox)
    autoSelectCheckbox.checked = DEFAULT_SETTINGS.autoSelectOnAutoList;

  await saveSettings({
    excludedExpansions: DEFAULT_SETTINGS.excludedExpansions,
    autoSelectOnAutoList: DEFAULT_SETTINGS.autoSelectOnAutoList,
  });

  setStatus("Default settings restored.");
};

saveButton?.addEventListener("click", () => {
  void saveForm();
});

resetButton?.addEventListener("click", () => {
  void resetDefaults();
});

void loadForm();
