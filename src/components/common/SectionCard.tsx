import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  hint?: string;
  children: ReactNode;
};

export function SectionCard({ title, hint, children }: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-card__header">
        <h2>{title}</h2>
        {hint ? <span>{hint}</span> : null}
      </div>
      <div className="section-card__body">{children}</div>
    </section>
  );
}
