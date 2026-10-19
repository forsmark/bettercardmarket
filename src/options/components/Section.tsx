import { type ReactNode, useId } from "react";

type SectionProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export const Section = ({
  title,
  description,
  actions,
  children,
}: SectionProps) => {
  const headingId = useId();
  return (
    <section className="section" aria-labelledby={headingId}>
      <header className="section__header">
        <div>
          <h2 id={headingId} className="section__title">
            {title}
          </h2>
          {description && <p className="section__description">{description}</p>}
        </div>
        {actions && <div className="section__actions">{actions}</div>}
      </header>
      <div className="section__body">{children}</div>
    </section>
  );
};
