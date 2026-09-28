import { Icon } from "./Icon";

/**
 * Used for sidebar destinations that exist on purpose (Marketing, Reports,
 * Employee Activity) but don't have real backing data/APIs yet. Keeps the
 * navigation structure honest instead of showing invented sample data.
 */
export function ComingSoonPanel({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="coming-soon-panel">
      <span className="coming-soon-icon">
        <Icon name="sparkle" size={20} />
      </span>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="coming-soon-tag">Coming soon</span>
    </section>
  );
}
