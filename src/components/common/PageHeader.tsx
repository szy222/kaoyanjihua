type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="page-header">
      {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      <p className="page-header__description">{description}</p>
    </header>
  );
}
