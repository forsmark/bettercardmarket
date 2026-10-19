import { type ReactNode, useId } from "react";

type SwitchFieldProps = {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export const SwitchField = ({
  label,
  description,
  checked,
  onChange,
}: SwitchFieldProps) => {
  const id = useId();
  const descriptionId = `${id}-description`;
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
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        aria-describedby={description ? descriptionId : undefined}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
};
