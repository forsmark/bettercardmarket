import { type ReactNode, useId, useState } from "react";

type NumberFieldProps = {
  label: string;
  description?: ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

/** Number input that saves on blur or Enter, and clamps to [min, max]. */
export const NumberField = ({
  label,
  description,
  value,
  min,
  max,
  onChange,
}: NumberFieldProps) => {
  const id = useId();
  const descriptionId = `${id}-description`;
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number.parseInt(draft, 10);
    setDraft(null);
    if (Number.isNaN(parsed)) return;
    const next = Math.min(max, Math.max(min, parsed));
    if (next !== value) onChange(next);
  };

  return (
    <div className="field field--inline">
      <div className="field__text">
        <label htmlFor={id} className="field__label">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="field__description">
            {description}
          </p>
        )}
      </div>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        className="input input--number"
        min={min}
        max={max}
        value={draft ?? String(value)}
        aria-describedby={description ? descriptionId : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") setDraft(null);
        }}
      />
    </div>
  );
};
