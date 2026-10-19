import { type FormEvent, useId, useState } from "react";
import { normalizePatternList } from "../../shared/settings";

type PatternListEditorProps = {
  label: string;
  placeholder: string;
  emptyText: string;
  patterns: readonly string[];
  onChange: (patterns: string[]) => void;
};

/**
 * Editable list of name patterns. Pasting several lines adds one pattern per
 * line.
 */
export const PatternListEditor = ({
  label,
  placeholder,
  emptyText,
  patterns,
  onChange,
}: PatternListEditorProps) => {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState("");

  const add = (event: FormEvent) => {
    event.preventDefault();
    const entries = normalizePatternList(draft.split(/\r?\n|,/));
    if (!entries.length) return;

    const known = new Set(patterns.map((p) => p.toLowerCase()));
    const fresh = entries.filter((e) => !known.has(e.toLowerCase()));
    if (!fresh.length) {
      setHint(`"${entries.join('", "')}" is already in the list.`);
      return;
    }
    onChange([...patterns, ...fresh]);
    setDraft("");
    setHint("");
  };

  const remove = (pattern: string) =>
    onChange(patterns.filter((p) => p !== pattern));

  return (
    <div className="patterns">
      <form className="patterns__form" onSubmit={add}>
        <label htmlFor={inputId} className="visually-hidden">
          {label}
        </label>
        <input
          id={inputId}
          className="input patterns__input"
          value={draft}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            setHint("");
          }}
        />
        <button type="submit" className="button" disabled={!draft.trim()}>
          Add
        </button>
      </form>
      <p id={hintId} className="patterns__hint" aria-live="polite">
        {hint}
      </p>
      {patterns.length ? (
        <ul className="patterns__list" aria-label={label}>
          {patterns.map((pattern) => (
            <li key={pattern} className="pattern">
              <span className="pattern__text">{pattern}</span>
              <button
                type="button"
                className="pattern__remove"
                aria-label={`Remove "${pattern}"`}
                onClick={() => remove(pattern)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="patterns__empty">{emptyText}</p>
      )}
    </div>
  );
};
